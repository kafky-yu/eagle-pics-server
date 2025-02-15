"use client";

import { useCallback, useMemo } from "react";

import { VIDEO_EXT } from "@rao-pics/constant";
import type { EXT } from "@rao-pics/constant";

import { trpc } from "~/utils/trpc";

import "photoswipe/style.css";

import { useSearchParams } from "next/navigation";
import { useRecoilValue } from "recoil";

import { settingSelector } from "~/states/setting";
import { getImageQuery } from "~/utils/get-image-query";
// import ChildFolderCardList from "../_components/ChildFolderCardList";
import Responsive from "../_components/Responsive";

function Page() {
  const setting = useRecoilValue(settingSelector);

  const { data: config } = trpc.config.findUnique.useQuery();
  const search = useSearchParams();
  const m = search.get("m");

  // 使用 useMemo 来控制何时重新请求数据
  const queryKey = useMemo(
    () => [
      m,
      // 如果是前端排序，则不触发重新请求
      setting.orderBy.clientSort ? undefined : setting.orderBy,
      setting.shuffle,
    ],
    [m, setting.orderBy, setting.shuffle],
  );

  const imageQuery = useCallback(
    () => getImageQuery(m, setting.orderBy, setting.shuffle),
    queryKey,
  )();

  const pages = imageQuery.data?.pages;
  // const count = imageQuery.data?.pages[0]?.count;

  const images = useMemo(() => {
    if (!config) return [];

    const result = pages?.map((page) => {
      return page.data.map((image) => {
        const pathParts = image.path.split(/\/|\\/);
        const libraryName = pathParts[pathParts.length - 4]?.replace(
          ".library",
          "",
        );
        const imageId = pathParts[pathParts.length - 2];

        const host = `http://${config.ip}:${config.clientPort}`;
        const src = `${host}/static/${libraryName}/images/${imageId}/${image.name}.${image.ext}`;
        const thumbnailPath = image.noThumbnail
          ? src
          : `${host}/static/${libraryName}/images/${imageId}/${image.name}_thumbnail.png`;

        return {
          id: image.id,
          src,
          thumbnailPath,
          bgColor: image.palettes?.[0]
            ? `rgb(${image.palettes[0].color.join(", ")})`
            : "rgb(255, 255, 255)",
          width: image.width,
          height: image.height,
          ext: image.ext as unknown as typeof EXT,
          type: VIDEO_EXT.includes(image.ext) ? "video" : "image",
          msrc: thumbnailPath,
        };
      });
    });

    const flatResult = result?.flat() ?? [];

    // 前端排序
    return [...flatResult].sort((a, b) => {
      // 按名称排序
      if (setting.orderBy.name) {
        const aName = a.src.split("/").pop() ?? "";
        const bName = b.src.split("/").pop() ?? "";
        return setting.orderBy.name === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }

      // 按修改时间排序
      if (setting.orderBy.modificationTime) {
        const aTime =
          pages
            ?.find((p) => p.data.some((img) => img.id === a.id))
            ?.data.find((img) => img.id === a.id)?.modificationTime ?? 0;
        const bTime =
          pages
            ?.find((p) => p.data.some((img) => img.id === b.id))
            ?.data.find((img) => img.id === b.id)?.modificationTime ?? 0;
        return setting.orderBy.modificationTime === "asc"
          ? aTime - bTime
          : bTime - aTime;
      }

      return 0;
    });
  }, [config, pages, setting.orderBy.modificationTime, setting.orderBy.name]);

  const onLoadMore = async () => {
    if (imageQuery.hasNextPage) {
      await imageQuery.fetchNextPage();
    }
  };

  // const ChildFolder = useCallback(() => {
  //   if (!m) return null;
  //   if (m === "trash") return null;
  //   if (count) return null;

  //   return <ChildFolderCardList folderId={m} />;
  // }, [count, m]);

  return (
    <Responsive
      onLoadMore={onLoadMore}
      images={images}
      // 如果选择了文件夹，则直接加载所有图片
      loadAll={!!m}
    >
      {/* <ChildFolder /> */}
    </Responsive>
  );
}

export default Page;
