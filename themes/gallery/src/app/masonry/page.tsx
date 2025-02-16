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
import Masonry from "../_components/Masonry";

function Home() {
  const setting = useRecoilValue(settingSelector);
  const { data: config } = trpc.config.findUnique.useQuery();

  const search = useSearchParams();
  const m = search.get("m");

  const imageQuery = useCallback(
    () => getImageQuery(m, setting.orderBy, setting.shuffle),
    [m, setting.orderBy, setting.shuffle],
  )();

  const pages = imageQuery.data?.pages;
  // const count = imageQuery.data?.pages[0]?.count;

  const images = useMemo(() => {
    if (!config || !pages) return [];

    // 使用 Map 存储图片数据，确保唯一性
    const imageMap = new Map<
      string,
      {
        id: string;
        src: string;
        thumbnailPath: string;
        msrc: string;
        bgColor: string;
        width: number;
        height: number;
        ext: typeof EXT;
        type: "video" | "image";
        modificationTime: number;
      }
    >();

    pages.forEach((page) => {
      page.data.forEach((image) => {
        // 如果图片已经存在，跳过
        if (imageMap.has(image.id)) return;

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

        imageMap.set(image.id, {
          id: image.id,
          src,
          thumbnailPath,
          msrc: thumbnailPath,
          bgColor: image.palettes?.[0]
            ? `rgb(${image.palettes[0].color.join(", ")})`
            : "rgb(255, 255, 255)",
          width: image.width,
          height: image.height,
          ext: image.ext as unknown as typeof EXT,
          type: VIDEO_EXT.includes(image.ext) ? "video" : "image",
          modificationTime: image.modificationTime,
        });
      });
    });

    const result = Array.from(imageMap.values());

    // 只在需要前端排序时才排序
    if (setting.orderBy.clientSort) {
      result.sort((a, b) => {
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
          return setting.orderBy.modificationTime === "asc"
            ? (a.modificationTime ?? 0) - (b.modificationTime ?? 0)
            : (b.modificationTime ?? 0) - (a.modificationTime ?? 0);
        }

        return 0;
      });
    }

    return result;
  }, [config, pages, setting.orderBy]);

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
    <Masonry
      images={images}
      onLoadMore={onLoadMore}
      // 如果选择了文件夹，则直接加载所有图片
      loadAll={!!m}
    >
      {/* <ChildFolder /> */}
    </Masonry>
  );
}

export default Home;
