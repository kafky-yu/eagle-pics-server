import { EventEmitter } from "events";
import { join } from "path";
import { observable } from "@trpc/server/observable";
import chokidar from "chokidar";
import { debounce } from "lodash";
import { z } from "zod";

import type { PendingTypeEnum } from "@rao-pics/constant";
import type { Prisma } from "@rao-pics/db";
import { prisma } from "@rao-pics/db";

import { router } from "..";
import { restartClientServer } from "./server";
import { syncFolder } from "./sync";
import { checkedImage } from "./sync/image";
import { t } from "./utils";

const ee = new EventEmitter();

let watcher: chokidar.FSWatcher | null = null;

export const libraryInput = {
  update: z.object({
    lastSyncTime: z.date().optional(),
  }),
};

export const libraryCore = {
  findUnique: async () => {
    const library = await prisma.library.findFirst({
      where: { isActive: true }
    });

    if (!library) return null;

    const [pendingCount, syncCount, trashCount, unSyncCount] =
      await prisma.$transaction([
        prisma.pending.count({
          where: { path: { startsWith: library.path } }
        }),
        prisma.image.count({
          where: { path: { startsWith: library.path } }
        }),
        prisma.image.count({
          where: {
            isDeleted: true,
            path: { startsWith: library.path }
          }
        }),
        prisma.log.count({
          where: { path: { startsWith: library.path } }
        }),
      ]);

    if (!library) return null;

    return {
      ...library,
      pendingCount,
      syncCount,
      unSyncCount,
      trashCount,
    };
  },

  findMany: async () => {
    return await prisma.library.findMany();
  },

  setActive: async ({ path }: { path: string }) => {
    // 停止当前的文件监视
    if (watcher) {
      watcher.unwatch("*");
      watcher = null;
    }

    // 获取当前活动库
    const currentLibrary = await prisma.library.findFirst({
      where: { isActive: true }
    });

    // 清理之前库的状态
    if (currentLibrary) {
      // 只清理当前库的日志和待同步状态
      await prisma.$transaction([
        prisma.log.deleteMany({
          where: { path: { startsWith: currentLibrary.path } }
        }),
        prisma.pending.deleteMany({
          where: { path: { startsWith: currentLibrary.path } }
        })
      ]);
    }

    // 将所有库设置为非活动
    await prisma.library.updateMany({
      data: { isActive: false }
    });

    // 设置指定库为活动
    const library = await prisma.library.update({
      where: { path },
      data: { isActive: true }
    });

    // 更新 config 中的活动库路径
    await prisma.config.update({
      where: { name: "config" },
      data: { activeLibraryPath: path }
    });

    // 重新启动客户端服务，触发新库的扫描
    await restartClientServer();

    // 主动触发一次扫描
    const caller = router.createCaller({});
    await caller.library.watch({ path });
    // 等待扫描完成
    await new Promise<void>((resolve) => {
      const onWatch = (data: { status: string }) => {
        if (data.status === "completed") {
          ee.off("watch", onWatch);
          resolve();
        }
      };
      ee.on("watch", onWatch);
    });

    return library;
  },

  update: async (input: z.infer<(typeof libraryInput)["update"]>) => {
    const json: Prisma.LibraryUpdateInput = {};

    if (input.lastSyncTime) {
      json.lastSyncTime = input.lastSyncTime;
    }

    // 只更新当前活动的库
    const library = await prisma.library.findFirst({
      where: { isActive: true }
    });

    if (!library) {
      throw new Error("没有找到活动的库");
    }

    return await prisma.library.update({
      where: { path: library.path },
      data: json,
    });
  },

  deleteActive: async () => {
    // 获取当前活动库
    const library = await prisma.library.findFirst({
      where: { isActive: true }
    });

    if (!library) {
      throw new Error("No active library found.");
    }

    // 停止当前的文件监视
    if (watcher) {
      watcher.unwatch("*");
      watcher = null;
    }

    // 删除当前库相关的所有数据
    await prisma.$transaction([
      // 删除库记录
      prisma.library.delete({
        where: { path: library.path }
      }),
      // 删除相关的日志和待同步状态
      prisma.log.deleteMany({
        where: { path: { startsWith: library.path } }
      }),
      prisma.pending.deleteMany({
        where: { path: { startsWith: library.path } }
      }),
      prisma.image.deleteMany({
        where: { path: { startsWith: library.path } }
      }),
      // 删除相关的标签、文件夹和颜色
      prisma.tag.deleteMany(),
      prisma.folder.deleteMany(),
      prisma.color.deleteMany()
    ]);

    // 查找剩余的库，按创建时间排序
    const remainingLibrary = await prisma.library.findFirst({
      orderBy: { createdTime: 'asc' }
    });

    let nextLibrary = null;
    
    if (remainingLibrary) {
      // 如果还有库，使用 setActive 来切换
      nextLibrary = await libraryCore.setActive({ path: remainingLibrary.path });
    } else {
      // 如果没有库了，清除 config 中的活动库路径
      await prisma.config.update({
        where: { name: "config" },
        data: { activeLibraryPath: null }
      });
      // 重启服务
      await restartClientServer();
    }

    return { 
      success: true,
      nextLibrary
    };
  }
};

export const library = t.router({
  findUnique: t.procedure.query(libraryCore.findUnique),
  findMany: t.procedure.query(libraryCore.findMany),
  setActive: t.procedure.input(z.object({ path: z.string() })).mutation(({ input }) => libraryCore.setActive(input)),
  delete: t.procedure.mutation(() => libraryCore.deleteActive()),

  add: t.procedure.input(z.string()).mutation(async ({ input }) => {
    if (!input.endsWith(".library")) {
      throw new Error(`Must be a '.library' directory.`);
    }

    // 检查库是否已存在
    const existingLib = await prisma.library.findUnique({
      where: { path: input }
    });

    if (existingLib) {
      throw new Error("Library already exists.");
    }

    // 停止当前的文件监视
    if (watcher) {
      watcher.unwatch("*");
      watcher = null;
    }

    // 清理之前库的状态
    await prisma.$transaction([
      // 将所有库设置为非活动
      prisma.library.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      }),
      // 清理之前的日志和待同步状态
      prisma.log.deleteMany(),
      prisma.pending.deleteMany()
    ]);

    // 创建新库，并设置为活动状态
    const lib = await prisma.library.create({
      data: {
        path: input,
        type: "eagle",
        isActive: true,
      },
    });

    // 更新 config 中的活动库路径
    await prisma.config.update({
      where: { name: "config" },
      data: { activeLibraryPath: input }
    });

    // 重启服务，触发新库的扫描
    await restartClientServer();

    // 主动触发一次扫描
    const caller = router.createCaller({});
    await caller.library.watch({ path: input });
    
    // 等待扫描完成
    await new Promise<void>((resolve) => {
      const onWatch = (data: { status: string }) => {
        if (data.status === "completed") {
          ee.off("watch", onWatch);
          resolve();
        }
      };
      ee.on("watch", onWatch);
    });

    return lib;
  }),

  update: t.procedure
    .input(libraryInput.update)
    .mutation(async ({ input }) => libraryCore.update(input)),

  deleteAll: t.procedure.mutation(async () => {
    if (watcher) {
      watcher.unwatch("*");
      watcher = null;
    }

    const result = await prisma.$transaction([
      prisma.library.deleteMany(),
      prisma.pending.deleteMany(),
      prisma.image.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.folder.deleteMany(),
      prisma.log.deleteMany(),
      prisma.color.deleteMany(),
    ]);

    await restartClientServer();

    return result;
  }),

  /**
   * 监听 Library 变化
   */
  watch: t.procedure
    .input(
      z.object({
        path: z.string(),
        // 重启应用，需要等待一段时间，否则 onWatch 监听不到 emit start
        isReload: z.boolean().optional(),
        // 和数据库中的 isStartDiffLibrary 一样
        isStartDiffLibrary: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) => {
      const { path: libraryPath, isReload, isStartDiffLibrary } = input;
      if (watcher) return;

      if (isReload) {
        setTimeout(() => {
          ee.emit("watch", { status: "start" });
        }, 1000);
      } else {
        ee.emit("watch", { status: "start" });
      }

      chokidar
        .watch(join(libraryPath, "metadata.json"))
        .on("change", (path) => {
          void syncFolder(path);
        });

      watcher = chokidar.watch(
        join(libraryPath, "images", "**", "metadata.json"),
      );

      const caller = router.createCaller({});
      const paths = new Set<{ path: string; type: PendingTypeEnum }>();

      const start = debounce(async () => {
        let count = 0;
        for (const { path, type } of paths) {
          count++;
          try {
            // 先检查文件是否需要同步
            if (type === "create" || type === "update") {
              const needSync = await checkedImage(path);
              if (!needSync) {
                ee.emit("watch", { status: "ok", data: { path, type }, count, message: "文件已同步" });
                continue;
              }
            }

            await caller.pending.upsert({ path, type });
            ee.emit("watch", { status: "ok", data: { path, type }, count });
          } catch (e) {
            ee.emit("watch", {
              status: "error",
              data: { path, type },
              count,
              message: (e as Error).message,
            });
          }
        }

        paths.clear();
        ee.emit("watch", { status: "completed" });

        const config = await caller.config.findUnique();
        // 自动同步开启
        if (config?.autoSync) {
          await caller.sync.start({ libraryPath });
        }
      }, 1000);

      watcher
        .on("add", (path) => {
          paths.add({ path, type: "create" });
          void start();
        })
        .on("change", (path) => {
          paths.add({ path, type: "update" });
          void start();
        })
        .on("unlink", (path) => {
          paths.add({ path, type: "delete" });
          void start();
        })
        .on("ready", () => {
          // 重启时对比资源库  关闭
          if (!isStartDiffLibrary && isReload) {
            paths.clear();
            void start();
          }
        });

      return { status: "ok" };
    }),

  onWatch: t.procedure.subscription(() => {
    interface T {
      status: "ok" | "completed" | "error" | "start";
      data?: { path: string; type: PendingTypeEnum };
      message?: string;
      count: number;
    }

    return observable<T>((emit) => {
      function onGreet(data: T) {
        emit.next(data);
      }

      ee.on("watch", onGreet);

      return () => {
        ee.off("watch", onGreet);
      };
    });
  }),
});
