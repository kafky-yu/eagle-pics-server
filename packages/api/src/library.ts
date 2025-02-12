import { EventEmitter } from "events";
import { join } from "path";
import { observable } from "@trpc/server/observable";
import type chokidar from "chokidar";
import { debounce } from "lodash";
import { z } from "zod";

import type { PendingTypeEnum } from "@rao-pics/constant";
import type { Library, Prisma } from "@rao-pics/db";
import { prisma } from "@rao-pics/db";

import { router } from "..";
import { restartClientServer } from "./server";
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
    const requestOptions: RequestInit = {
      method: "GET",
      redirect: "follow",
    };

    const response = await fetch(
      "http://localhost:41595/api/library/info",
      requestOptions,
    ).then((res) => res.json());

    const library_path: string = response.data.library.path;
    const library_name: string = response.data.library.name;
    const modificationTime: Date = new Date(response.data.modificationTime);

    const folders_data = await fetch(
      "http://localhost:41595/api/folder/list",
      requestOptions,
    ).then((res) => res.json());

    let image_cnt = 0;
    for (const folder of folders_data.data) {
      image_cnt += folder.imageCount;
    }

    return {
      library_name,
      path: library_path,
      image_cnt,
      modificationTime: modificationTime,
    };
  },

  findMany: async () => {
    const requestOptions: RequestInit = {
      method: "GET",
      redirect: "follow",
    };
    const response = await fetch(
      "http://localhost:41595/api/library/history",
      requestOptions,
    ).then((res) => res.json());

    const library_list = response.data;

    const active_library = await fetch(
      "http://localhost:41595/api/library/info",
      requestOptions,
    ).then((res) => res.json());

    const active_library_path: string = active_library.data.library.path;

    const result = [];
    for (const lib of library_list) {
      result.push({ path: lib, isActive: lib === active_library_path });
    }

    return result;
  },

  setActive: async ({ path }: { path: string }): Promise<null> => {
    // 停止当前的文件监视

    // 主动触发一次扫描
    const caller = router.createCaller({});
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

    return null;
  },

  deleteActive: async (): Promise<{
    success: boolean;
    nextLibrary: Library | null;
  }> => {
    // 获取当前活动库
    const library = await prisma.library.findFirst({
      where: { isActive: true },
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
        where: { path: library.path },
      }),
      // 删除相关的日志和待同步状态
      prisma.log.deleteMany({
        where: { path: { startsWith: library.path } },
      }),
      prisma.pending.deleteMany({
        where: { path: { startsWith: library.path } },
      }),
      prisma.image.deleteMany({
        where: { path: { startsWith: library.path } },
      }),
      // 删除相关的标签、文件夹和颜色
      prisma.tag.deleteMany(),
      prisma.folder.deleteMany(),
      prisma.color.deleteMany(),
    ]);

    // 查找剩余的库，按创建时间排序
    const remainingLibrary = await prisma.library.findFirst({
      orderBy: { createdTime: "asc" },
    });

    let nextLibrary: Library | null = null;

    if (remainingLibrary) {
      // 如果还有库，使用 setActive 来切换
      nextLibrary = await libraryCore.setActive({
        path: remainingLibrary.path,
      });
    } else {
      // 如果没有库了，清除 config 中的活动库路径
      await prisma.config.update({
        where: { name: "config" },
        data: { activeLibraryPath: null },
      });
      // 重启服务
      await restartClientServer();
    }

    return {
      success: true,
      nextLibrary,
    };
  },
};

export const library = t.router({
  findUnique: t.procedure.query(libraryCore.findUnique),
  findMany: t.procedure.query(libraryCore.findMany),
  setActive: t.procedure
    .input(z.object({ path: z.string() }))
    .mutation(({ input }) => libraryCore.setActive(input)),
});
