import { z } from "zod";

import { t } from "../utils";
import { eagleService } from "./service";
import type { SearchParams } from "./types";

export const imageInput = {
  find: z.object({
    limit: z.number().min(1).max(100).optional(),
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

      // console.log("request", search_params);
      const images = await eagleService.getItems(search_params);

      const result = [];
      for (const image of images) {
        const image_path = await eagleService.getOriginalImage(image.id);
        const thumbnail_path = await eagleService.getThumbnail(image.id);
        const temp = {
          ...image,
          path: image_path,
          noThumbnail: thumbnail_path === image_path ?? true,
        };
        result.push(temp);
      }

      let nextCursor: number | undefined = undefined;

      if (result.length <= limit && result.length > 0) {
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
      console.log("input", input);
      console.log("folders", folders);

      return folders.find((folder) => folder.id === input.id);
    }),

  // 获取文件夹列表
  getFolders: t.procedure.query(() => eagleService.getFolders()),

  // 获取缩略图
  getThumbnail: t.procedure
    .input(z.string())
    .query(({ input }) => eagleService.getThumbnail(input)),

  // 获取原始图片
  getOriginalImage: t.procedure
    .input(z.string())
    .query(({ input }) => eagleService.getOriginalImage(input)),

  // 获取指定文件夹的图片
  //todo

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

      console.log("cursor :", cursor);

      const images = await eagleService.getItems(search_params);

      const result = [];
      for (const image of images) {
        const image_path = await eagleService.getOriginalImage(image.id);
        const thumbnail_path = await eagleService.getThumbnail(image.id);
        const temp = {
          ...image,
          path: image_path,
          noThumbnail: thumbnail_path === image_path ?? true,
        };
        result.push(temp);
      }

      let nextCursor: number | undefined = undefined;

      if (result.length <= limit && result.length > 0) {
        nextCursor = (cursor ?? 0) + 1;
      }
      console.log(
        `response result.length ${result.length}, nextCursor ${nextCursor},limit ${limit}`,
      );

      return {
        data: result,
        nextCursor,
      };
    }),

  getItemShuffle: t.procedure
    .input(imageInput.find.optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const { cursor, includes } = input ?? {};

      const search_params: SearchParams = {
        limit,
        offset: cursor ?? 0,
        folders: includes,
      };
      const images = await eagleService.getItems(search_params);

      const result = [];
      for (const image of images) {
        const image_path = await eagleService.getOriginalImage(image.id);
        const thumbnail_path = await eagleService.getThumbnail(image.id);
        const temp = {
          ...image,
          path: image_path,
          noThumbnail: thumbnail_path === image_path ?? true,
        };
        result.push(temp);
      }

      let nextCursor: number | undefined = undefined;

      if (result.length <= limit && result.length > 0) {
        nextCursor = (cursor ?? 0) + 1;
      }

      console.log("response", result, nextCursor);

      return {
        data: result,
        nextCursor,
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
