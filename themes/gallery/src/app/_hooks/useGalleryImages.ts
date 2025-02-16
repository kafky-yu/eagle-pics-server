import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRecoilValue } from "recoil";

import { VIDEO_EXT } from "@rao-pics/constant";
import type { EXT } from "@rao-pics/constant";

import { settingSelector } from "~/states/setting";
import { getImageQuery } from "~/utils/get-image-query";
import { trpc } from "~/utils/trpc";

export interface GalleryImage {
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

export function useGalleryImages() {
  const setting = useRecoilValue(settingSelector);
  const { data: config } = trpc.config.findUnique.useQuery();

  const search = useSearchParams();
  const m = search.get("m");

  const imageQuery = useCallback(
    () => getImageQuery(m, setting.orderBy),
    [m, setting.orderBy],
  )();

  const pages = imageQuery.data?.pages;

  const images = useMemo(() => {
    if (!config || !pages) return [];

    const imageMap = new Map<string, GalleryImage>();

    pages.forEach((page) => {
      page.data.forEach((image) => {
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

    if (setting.orderBy.clientSort) {
      result.sort((a, b) => {
        if (setting.orderBy.name) {
          const aName = a.src.split("/").pop() ?? "";
          const bName = b.src.split("/").pop() ?? "";
          return setting.orderBy.name === "asc"
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }

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

  return {
    images,
    onLoadMore,
    loadAll: !!m,
  };
}
