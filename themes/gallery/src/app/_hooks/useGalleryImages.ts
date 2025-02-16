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
      // 自然排序比较函数
      const naturalCompare = (a: string, b: string): number => {
        // 处理空值情况
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;

        const splitRegex = /(\d+|\D+)/g;
        const ax = a.toLowerCase().match(splitRegex) ?? [];
        const bx = b.toLowerCase().match(splitRegex) ?? [];

        // 如果任一字符串为空，直接比较原始字符串
        if (ax.length === 0 && bx.length === 0) return a.localeCompare(b) || 0;
        if (ax.length === 0) return -1;
        if (bx.length === 0) return 1;

        for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
          if (ax[i] !== bx[i]) {
            const num1 = parseInt(ax[i] ?? "0");
            const num2 = parseInt(bx[i] ?? "0");

            if (!isNaN(num1) && !isNaN(num2)) {
              return num1 - num2;
            }
            return ax[i]?.localeCompare(bx[i] ?? "") ?? 0;
          }
        }
        return ax.length - bx.length;
      };

      result.sort((a, b) => {
        if (setting.orderBy.name) {
          const aName = a.src.split("/").pop() ?? "";
          const bName = b.src.split("/").pop() ?? "";

          if (setting.orderBy.name === "asc") {
            return naturalCompare(aName, bName);
          } else {
            return naturalCompare(bName, aName);
          }
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
