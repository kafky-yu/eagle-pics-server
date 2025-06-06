import { z } from "zod";

import { prisma } from "@rao-pics/db";

import { t } from "../utils";
import { eagleService } from "./service";
import type { EagleFolder, EagleItem, SearchParams } from "./types";

export const imageInput = {
  find: z.object({
    limit: z.number().min(1).max(10000).optional(),
    cursor: z.number().nullish(),
    includes: z.enum(["tags", "colors", "folders"]).array().optional(),
    orderBy: z
      .object({
        modificationTime: z.enum(["asc", "desc"]).optional(),
        mtime: z.enum(["asc", "desc"]).optional(),
        name: z.enum(["asc", "desc"]).optional(),
      })
      .optional()
      .default({ modificationTime: "desc" }),
  }),

  findUnique: z.object({
    id: z.number().optional(),
    path: z.string().optional(),
    includes: z.enum(["tags", "colors", "folders"]).array().optional(),
  }),

  deleteByUnique: z
    .object({ id: z.number().optional(), path: z.string().optional() })
    .partial()
    .refine(
      (input) => !!input.id || !!input.path,
      "id or path either one is required",
    ),
};

export const eagle = t.router({
  // 获取图库信息
  getLibraryInfo: t.procedure.query(() => eagleService.getLibraryInfo()),

  // 获取图库历史
  getLibraryList: t.procedure.query(() => eagleService.getLibraryList()),

  // 切换图库
  switchLibrary: t.procedure
    .input(z.object({ libraryPath: z.string() }))
    .mutation(({ input }) => eagleService.switchLibrary(input.libraryPath)),

  // 获取图片列表

  getItems: t.procedure
    .input(imageInput.find.optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const { cursor, orderBy } = input ?? {};

      const search_params: SearchParams = {
        limit,
        offset: cursor ?? 0,
        orderBy: convertOrderBy(orderBy),
      };

      const images = await eagleService.getItems(search_params);

      const result: (EagleItem & { path: string; noThumbnail: boolean })[] = [];
      for (const image of images) {
        const image_path = await eagleService.getOriginalImage(image.id);
        const thumbnail_path = await eagleService.getThumbnail(image.id);
        const temp = {
          ...image,
          path: image_path,
          noThumbnail: thumbnail_path === image_path,
        };
        result.push(temp);
      }

      let nextCursor: number | undefined = undefined;

      // 只有当结果数量等于 limit 时，才表示还有下一页
      if (result.length === limit) {
        nextCursor = (cursor ?? 0) + 1;
      }

      return {
        data: result,
        nextCursor,
      };
    }),
  //获取文件夹信息
  getFolderInfo: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { folders } = await eagleService.getLibraryInfo();
      const dbFolders: {
        id: string;
        name: string;
        coverId: string | null;
        count: number;
      }[] = await prisma.folder.findMany();

      // 递归查找文件夹
      const findFolder = (
        folders: EagleFolder[],
        id: string,
      ): EagleFolder | null => {
        for (const folder of folders) {
          if (folder.id === id) {
            return folder;
          }
          if (folder.children?.length > 0) {
            const found = findFolder(folder.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const result = findFolder(folders, input.id);

      return {
        ...result,
        children: result?.children?.map((child) => {
          const dbFolder = dbFolders.find((f) => f.id === child.id);
          return {
            ...child,
            count: dbFolder?.count ?? 0,
            coverId: child.coverId ?? dbFolder?.coverId ?? undefined,
          };
        }),
      };
    }),

  // 获取文件夹列表
  getFolders: t.procedure.query(async () => {
    const eagleFolders = await eagleService.getFolders();
    const dbFolders: {
      id: string;
      name: string;
      coverId: string | null;
      count: number;
    }[] = await prisma.folder.findMany();

    // 合并 Eagle 和数据库的文件夹信息
    return eagleFolders.map((folder): EagleFolder & { count: number } => {
      const dbFolder = dbFolders.find((f) => f.id === folder.id);
      return {
        ...folder,
        count: dbFolder?.count ?? 0,
        coverId: folder.coverId ?? dbFolder?.coverId ?? undefined,
      };
    });
  }),

  // 获取缩略图
  getThumbnail: t.procedure
    .input(z.string())
    .query(({ input }) => eagleService.getThumbnail(input)),

  // 获取原始图片
  getOriginalImage: t.procedure
    .input(z.string())
    .query(({ input }) => eagleService.getOriginalImage(input)),

  // 获取指定文件夹的图片

  getItemsByFolderId: t.procedure
    .input(imageInput.find.merge(z.object({ id: z.string() })))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const { cursor, orderBy, id } = input ?? {};

      const search_params: SearchParams = {
        limit,
        offset: cursor ?? 0,
        orderBy: convertOrderBy(orderBy),
        folders: id,
      };

      const images = await eagleService.getItems(search_params);

      const result: (EagleItem & { path: string; noThumbnail: boolean })[] = [];
      for (const image of images) {
        const image_path = await eagleService.getOriginalImage(image.id);
        const thumbnail_path = await eagleService.getThumbnail(image.id);
        const temp = {
          ...image,
          path: image_path,
          noThumbnail: thumbnail_path === image_path,
        };
        result.push(temp);
      }

      let nextCursor: number | undefined = undefined;

      // 只有当结果数量等于 limit 时，才表示还有下一页
      if (result.length === limit) {
        nextCursor = (cursor ?? 0) + 1;
      }

      return {
        data: result,
        nextCursor,
      };
    }),

  getItemById: t.procedure
    .input(imageInput.find.merge(z.object({ id: z.string() })))
    .query(async ({ input }) => {
      const { id } = input ?? {};

      const image = await eagleService.getItemById(id);

      return image;
    }),

  getItemsByIds: t.procedure
    .input(imageInput.find.merge(z.object({ ids: z.string().array() })))
    .query(async ({ input }) => {
      const { ids } = input ?? {};

      const images: (EagleItem & { path: string; noThumbnail: boolean })[] = [];
      for (const id of ids) {
        try {
          const [image, thumbnail_path] = await Promise.all([
            eagleService.getItemById(id),
            eagleService.getThumbnail(id),
          ]);

          const ext = image.ext;
          const image_path = thumbnail_path.replace(
            "_thumbnail.png",
            `.${ext}`,
          );

          images.push({
            ...image,
            path: image_path,
            noThumbnail: thumbnail_path === image_path,
          });
        } catch (error) {
          console.error(`获取图片失败 ${id}:`, error);
          continue;
        }
      }

      return images;
    }),

  createFolders: t.procedure.mutation(async () => {
    const { folders } = await eagleService.getLibraryInfo();

    // 获取数据库中所有的文件夹
    const existingFolders = await prisma.folder.findMany();

    // 递归收集所有文件夹的 ID
    const eagleFolderIds = new Set<string>();
    const collectFolderIds = (folder: EagleFolder) => {
      eagleFolderIds.add(folder.id);
      folder.children?.forEach(collectFolderIds);
    };
    folders.forEach(collectFolderIds);

    // 找出需要删除的文件夹（在数据库中存在但在 Eagle 中不存在）
    const foldersToDelete = existingFolders.filter(
      (folder) => !eagleFolderIds.has(folder.id),
    );

    // 删除不存在的文件夹
    if (foldersToDelete.length > 0) {
      await prisma.folder.deleteMany({
        where: {
          id: {
            in: foldersToDelete.map((folder) => folder.id),
          },
        },
      });
      console.log(`已删除 ${foldersToDelete.length} 个不存在的文件夹`);
    }

    // 构建文件夹的层级结构树
    const folderMap = new Map<
      string,
      {
        folder: EagleFolder;
        children: string[];
        totalCount?: number;
      }
    >();

    // 先建立文件夹之间的关系
    const buildFolderTree = (folder: EagleFolder) => {
      folderMap.set(folder.id, {
        folder,
        children: folder.children?.map((child) => child.id) ?? [],
      });
      folder.children?.forEach(buildFolderTree);
    };
    folders.forEach(buildFolderTree);

    // 从叶子节点开始计算
    const leafFolders = Array.from(folderMap.entries())
      .filter(([_, info]) => info.children.length === 0)
      .map(([id]) => id);

    // 按层级处理文件夹
    const processedFolders = new Set<string>();
    const folderQueue = [...leafFolders];

    const results: Awaited<ReturnType<typeof prisma.folder.upsert>>[] = [];
    while (folderQueue.length > 0) {
      const folderId = folderQueue.shift()!;
      if (processedFolders.has(folderId)) continue;

      const folderInfo = folderMap.get(folderId)!;
      const folder = folderInfo.folder;

      // 获取当前文件夹的图片
      let allImages: EagleItem[] = [];
      let offset = 0;
      const limit = 200;

      while (true) {
        const images = await eagleService.getItems({
          limit,
          offset,
          folders: folder.id,
        });

        if (!images || images.length === 0) break;
        allImages = allImages.concat(images);
        if (images.length < limit) break;
        offset += 1;
      }

      // 计算总 count：当前文件夹的图片数 + 所有子文件夹的 count 总和
      const childrenCount = folderInfo.children.reduce((sum, childId) => {
        return sum + (folderMap.get(childId)?.totalCount ?? 0);
      }, 0);
      const totalCount = allImages.length + childrenCount;
      folderInfo.totalCount = totalCount;

      // 更新数据库
      const result = await prisma.folder.upsert({
        where: { id: folder.id },
        create: {
          id: folder.id,
          name: folder.name,
          count: totalCount,
          coverId: folder.coverId ?? allImages[0]?.id ?? null,
        },
        update: {
          name: { set: folder.name },
          count: { set: totalCount },
          coverId: { set: folder.coverId ?? allImages[0]?.id ?? null },
        },
      });
      results.push(result);
      processedFolders.add(folderId);

      // 将该文件夹的父文件夹加入队列
      // 1. 找到所有包含当前文件夹作为子文件夹的文件夹
      const parentFolders = Array.from(folderMap.entries())
        .filter(([_, info]) => info.children.includes(folderId))
        .map(([id]) => id);

      // 2. 将这些父文件夹加入队列
      for (const parentId of parentFolders) {
        // 只有当父文件夹的所有子文件夹都处理完毕时，才处理父文件夹
        const parentInfo = folderMap.get(parentId)!;
        const allChildrenProcessed = parentInfo.children.every((childId) =>
          processedFolders.has(childId),
        );

        if (allChildrenProcessed && !processedFolders.has(parentId)) {
          folderQueue.push(parentId);
        }
      }
    }

    return {
      count: results.length,
    };
  }),
});

function convertOrderBy(orderBy?: {
  modificationTime?: "asc" | "desc";
  mtime?: "asc" | "desc";
  name?: "asc" | "desc";
}): string | undefined {
  if (!orderBy) return undefined;

  const mapping = {
    modificationTime: "CREATEDATE",
    mtime: "CREATEDATE",
    name: "NAME",
  };

  for (const [key, value] of Object.entries(orderBy)) {
    const field = mapping[key as keyof typeof mapping];
    if (field) {
      return value === "desc" ? `-${field}` : field;
    }
  }

  return undefined;
}
