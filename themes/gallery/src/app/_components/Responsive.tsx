"use client";

import { useCallback, useEffect, useMemo } from "react";
import Image from "next/legacy/image";
import { useSearchParams } from "next/navigation";
import justifyLayout from "justified-layout";
import {
  MasonryScroller,
  useContainerPosition,
  useInfiniteLoader,
  usePositioner,
} from "masonic";
import { useRecoilValue } from "recoil";

import { VIDEO_EXT } from "@rao-pics/constant";

import { useWindowSize } from "~/hooks/useWindowSize";
import { settingSelector } from "~/states/setting";
import { GALLERY_LIMIT } from "../_hooks/useGalleryLoader";
import type { GalleryImage, LayoutProps } from "../types/gallery";
import ChildFolderCardList from "./ChildFolderCardList";
import { GalleryBase } from "./GalleryBase"; // 更新 GalleryBase 的导入路径

interface Props {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
}

function useResponsiveLayout({
  images,
  containerWidth,
  windowWidth,
  onLoadMore,
}: LayoutProps) {
  const BOX_SPACING = 12;

  const items = useMemo(() => {
    if (images && containerWidth) {
      const results: ReturnType<typeof justifyLayout>[] = [];
      const imageTemp = JSON.parse(JSON.stringify(images)) as typeof images;
      const imageResult: (typeof images)[] = [];

      while (imageTemp.length > 0) {
        const result = justifyLayout(imageTemp, {
          maxNumRows: 1,
          containerWidth: containerWidth,
          containerPadding: 0,
          boxSpacing: BOX_SPACING,
          targetRowHeight: 240,
        });

        imageResult.push(imageTemp.splice(0, result.boxes.length));
        results.push(result);
      }

      return {
        justify: results,
        images: imageResult,
        boxSpacing: BOX_SPACING,
      };
    }

    return null;
  }, [images, containerWidth]);

  const positioner = usePositioner(
    {
      width: containerWidth,
      columnGutter: windowWidth < 768 ? 8 : 12,
      columnCount: 1,
    },
    [images],
  );

  const onRender = useInfiniteLoader(onLoadMore, {
    minimumBatchSize: GALLERY_LIMIT,
    threshold: 4,
  });

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        onRender(0, 1, images || []);
      }
    },
    [onRender, images],
  );

  return { items, handleRef, onRender, positioner };
}

function ResponsiveLayout(props: LayoutProps) {
  const { items, onRender, positioner } = useResponsiveLayout(props);

  const { images, loadAll, onLoadMore, containerRef } = props;

  const setting = useRecoilValue(settingSelector);
  const search = useSearchParams();
  //这里拿到当前的文件夹id
  const folderId = search.get("m") ?? "";

  const [windowWidth, windowHeight] = useWindowSize();
  const { offset } = useContainerPosition(containerRef, [
    windowWidth,
    windowHeight,
  ]);

  // 如果是 loadAll 模式或者内容不足一页，自动加载更多
  useEffect(() => {
    if (!images) return;

    if (loadAll) {
      console.log("加载所有图片模式");
      onLoadMore();
    } else if (images?.length < GALLERY_LIMIT) {
      console.log("内容不足一页，加载更多");
      onLoadMore();
    }
  }, [images, loadAll, onLoadMore]);

  if (!items) return null;

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
      <MasonryScroller
        onRender={onRender}
        positioner={positioner}
        height={windowHeight}
        offset={offset}
        containerRef={containerRef}
        items={items?.justify ?? []}
        render={({ data, index }) => {
          const itemImages = items?.images[index];
          return (
            <div
              style={{
                height: data.containerHeight + "px",
                position: "relative",
              }}
            >
              {data.boxes.map((box, i) => {
                const image = itemImages?.[i];

                return (
                  image && (
                    <div
                      key={image.id}
                      data-pswp-width={image.width}
                      data-pswp-height={image.height}
                      data-pswp-type={
                        VIDEO_EXT.includes(image.ext) ? "video" : "image"
                      }
                      rel="noreferrer"
                      className="relative block overflow-hidden rounded-box shadow"
                      style={{
                        width: `${box.width}px`,
                        height: `${box.height}px`,
                        position: "absolute",
                        top: `${box.top}px`,
                        left: `${box.left}px`,
                        backgroundColor: image.bgColor,
                      }}
                      onClick={() => props.onImageClick?.(image)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          props.onImageClick?.(image);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      {setting.showFileName && (
                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                          {image.src.split("/").pop()}
                        </div>
                      )}
                      <Image src={image.thumbnailPath} layout="fill" />
                    </div>
                  )
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
}

function Responsive({ children, images, onLoadMore, loadAll = false }: Props) {
  return (
    <GalleryBase
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
      layout="responsive"
    >
      {children}
    </GalleryBase>
  );
}

export { Responsive, ResponsiveLayout };
