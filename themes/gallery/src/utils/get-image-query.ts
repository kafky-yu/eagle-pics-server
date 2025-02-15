import { trpc } from "@rao-pics/trpc";

import type { SettingType } from "~/states/setting";

/**
 * 获取 trpc Query
 * @param m search Param m
 * @param orderBy setting.orderBy
 */
export const getImageQuery = (
  m: string | null,
  orderBy: SettingType["orderBy"],
  random?: boolean,
) => {
  const limit = 50;

  let find: ReturnType<typeof trpc.eagle.getItems.useInfiniteQuery> | undefined;
  let findByFolderId:
    | ReturnType<typeof trpc.eagle.getItemsByFolderId.useInfiniteQuery>
    | undefined;

  if (!m) {
    if (!find) {
      if (random) {
        find = trpc.eagle.getItemShuffle.useInfiniteQuery(
          {
            limit,
            includes: ["colors"],
            // 如果是前端排序，则不传递排序参数
            ...(!orderBy.clientSort ? { orderBy } : {}),
          },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      } else {
        find = trpc.eagle.getItems.useInfiniteQuery(
          {
            limit,
            includes: ["colors"],
            // 如果是前端排序，则不传递排序参数
            ...(!orderBy.clientSort ? { orderBy } : {}),
          },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      }
    }

    return find;
  }

  if (!findByFolderId) {
    findByFolderId = trpc.eagle.getItemsByFolderId.useInfiniteQuery(
      {
        limit,
        includes: ["colors"],
        orderBy,
        id: m,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );
  }

  return findByFolderId;
};
