import { EventEmitter } from "events";
import { join } from "path";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z, ZodError } from "zod";

import { prisma } from "@rao-pics/db";
import type { Pending } from "@rao-pics/db";
import { RLogger } from "@rao-pics/rlog";

import { routerCore } from "../..";
import { configCore } from "../config";
import { folderCore } from "../folder";
import { t } from "../utils";
import { diffFolder, handleFolder } from "./folder";
import { upsertImage } from "./image";

const ee = new EventEmitter();

/**
 * 同步新增逻辑
 * 1. 同步文件夹
 * 1.2 对比文件夹，删除旧的，新增新的
 * 2. 开始同步图片
 * 2.1 检测图片是否需要更新 (checkedImage) 默认最后更新时间小于3秒不更新
 * 2.2 读取图片元数据 (readJson) metadata.json
 * 2.3 创建标签 (Tag)
 * 2.4 创建颜色 (Color)
 * 2.5 创建图片并关联创建的 Tag、Color、Folder
 * 2.6 删除 pending
 * 2.7 删除没有关联图片的标签、颜色
 */

/**
 * 同步删除/更新逻辑，更新拆分为 => 创建新的，删除旧的
 * ... 同步新增逻辑
 *
 * 2.3 读取该图片的标签
 * 2.4 对比标签，找出需要新增/更新/删除的标签
 * 2.5 对比颜色，找出需要新增/更新/删除的颜色
 * 2.6 更新图片，并关联/取消关联 Tag、Color、Folder
 * 2.7 删除 pending
 * 2.8 删除没有关联图片的标签、颜色
 */

export const sync = t.router({
  start: t.procedure
    .input(
      z.object({
        libraryPath: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const pendings = (await routerCore.pending.get()) as Pending[];

      // 同步文件夹
      await syncFolder(join(input.libraryPath, "metadata.json"), input.libraryPath);

      await syncImage(pendings);

      // 同步完成自动更新 library lastSyncTime
      await routerCore.library.update({ lastSyncTime: new Date() });
      return true;
    }),

  onStart: t.procedure.subscription(() => {
    interface T {
      status: "ok" | "completed" | "error";
      type: "folder" | "image";
      data?: { id: string; name: string };
      count: number;
      message?: string;
    }

    return observable<T>((emit) => {
      function onGreet(data: T) {
        emit.next(data);
      }

      ee.on("sync.start", onGreet);

      return () => {
        ee.off("sync.start", onGreet);
      };
    });
  }),
});

export const syncFolder = async (path: string, libraryPath: string) => {
  try {
    const folders = handleFolder(path);

    let count = 0;
    for (const f of folders) {
      count++;
      await folderCore.upsert(f);
      ee.emit("sync.start", { status: "ok", type: "folder", data: f, count });
    }

    const config = await configCore.findUnique();
    await folderCore.setPwdFolderShow(config?.pwdFolder ?? false);

    //对比 folders 与 db 中的 folders，删除旧的
    // 只获取当前储存库的文件夹
    const oldFolders = await prisma.folder.findMany({
      where: {
        images: {
          some: {
            path: {
              startsWith: libraryPath
            }
          }
        }
      }
    });

    if (Array.isArray(oldFolders)) {
      const diff = diffFolder(
        folders.map((item) => item.id),
        oldFolders.map((item) => item.id),
      );

      // 删除时确保只删除当前储存库的文件夹
      prisma.folder
        .deleteMany({
          where: {
            id: {
              in: diff.disconnect,
            },
            // 确保文件夹属于当前储存库
            images: {
              some: {
                path: {
                  startsWith: libraryPath
                }
              }
            }
          },
        })
        .catch((e) => {
          RLogger.error(e, "syncFolder deleteMany");
        });
    }

    ee.emit("sync.start", { status: "completed", type: "folder" });
  } catch (e) {
    RLogger.error(e, "syncFolder");
  }
};

export const syncImage = async (pendings: Pending[]) => {
  let count = 0;

  for (const p of pendings) {
    count++;
    try {
      switch (p.type) {
        case "create":
          await upsertImage(p);
          ee.emit("sync.start", { status: "ok", type: "image", count });
          break;
        case "update":
          await upsertImage(p);
          ee.emit("sync.start", { status: "ok", type: "image", count });
          break;
        case "delete":
          routerCore.image
            .deleteByUnique({ path: p.path })
            .catch((e) =>
              RLogger.warning<typeof e>(e, "syncImage deleteByUnique"),
            );

          ee.emit("sync.start", { status: "ok", type: "image", count });
          break;
      }
    } catch (e) {
      ee.emit("sync.start", {
        status: "error",
        type: "image",
        count,
        message: e,
      });

      const errorMsg = (e as Error).message.match(/\[(?<type>.*)\]/);
      if (errorMsg) {
        const type = errorMsg[0].replace(/\[|\]/g, "");
        await routerCore.log.upsert({
          path: p.path,
          type: type as never,
          message: (e as Error).message,
        });
      } else {
        await routerCore.log.upsert({
          path: p.path,
          type: "unknown",
          message: (e as Error).stack ?? JSON.stringify(e),
        });
      }

      // continue; 当 return 使用
      if (e instanceof Error) {
        // 自定义 sync_error 无需上报
        if (e.cause === "sync_error") {
          RLogger.warning(e, "syncImage sync_error");
          continue;
        }

        // ZodError 类型错误 无需上报
        if (e instanceof TRPCError && e.cause instanceof ZodError) {
          RLogger.warning(e.cause, "syncImage ZodError");
          continue;
        }

        RLogger.error(e, "syncImage");
        continue;
      }

      RLogger.error<typeof e>(e, "syncImage");
    } finally {
      // 删除 pending
      routerCore.pending.delete(p.path).catch((e) => {
        RLogger.warning(e, "syncImage delete pending");
      });
    }
  }

  ee.emit("sync.start", { status: "completed", type: "image", count });
};
