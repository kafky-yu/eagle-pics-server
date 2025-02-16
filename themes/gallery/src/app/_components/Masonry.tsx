"use client";

import { useCallback, useEffect } from "react";
import Image from "next/legacy/image";
import { useSearchParams } from "next/navigation";
import { MasonryScroller, useInfiniteLoader, usePositioner } from "masonic";
import { useRecoilValue } from "recoil";

import { settingSelector } from "~/states/setting";
import { GALLERY_LIMIT } from "../_hooks/useGalleryLoader";
import type { GalleryImage, LayoutProps } from "../types/gallery";
import ChildFolderCardList from "./ChildFolderCardList";
import { GalleryBase } from "./GalleryBase";

interface Props {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
}

function useMasonryLayout({
  images,
  containerWidth,
  windowWidth,
  onLoadMore,
}: LayoutProps) {
  const columnWidth = windowWidth < 768 ? windowWidth / 3 : 224;
  const columnGutter = windowWidth < 768 ? 8 : 12;

  const positioner = usePositioner(
    {
      width: containerWidth,
      columnGutter,
      columnWidth,
    },
    [
      images?.map((img) => ({
        ...img,
        height: (img.height / img.width) * columnWidth,
      })),
    ],
  );

  const onRender = useInfiniteLoader(onLoadMore, {
    minimumBatchSize: GALLERY_LIMIT,
    threshold: 2,
  });

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        onRender(0, 1, images || []);
      }
    },
    [onRender, images],
  );

  return { positioner, handleRef, columnWidth, onRender };
}

function MasonryLayout(props: LayoutProps) {
  const { images, loadAll, onLoadMore, containerRef } = props;
  const { positioner, handleRef, onRender } = useMasonryLayout({
    images,
    containerWidth: props.containerWidth,
    windowWidth: props.windowWidth,
    containerRef,
    onLoadMore,
  });

  const setting = useRecoilValue(settingSelector);
  const search = useSearchParams();
  //这里拿到当前的文件夹id
  const folderId = search.get("m") ?? "";

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

  if (!images) return <div />;

  return (
    <div>
      {/* 文件夹导航 */}
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
      <MasonryScroller
        positioner={positioner}
        containerRef={containerRef}
        items={images}
        height={800}
        overscanBy={2}
        onRender={onRender}
        render={({ data: image }) => (
          <div
            key={image.id}
            className="relative cursor-pointer"
            ref={handleRef}
            onClick={() => props.onImageClick?.(image)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                props.onImageClick?.(image);
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: image.bgColor,
              height: (image.height / image.width) * positioner.columnWidth,
            }}
          >
            {setting.showFileName && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                {image.src.split("/").pop()}
              </div>
            )}
            <Image
              src={image.thumbnailPath}
              alt=""
              layout="fill"
              objectFit="cover"
              className="rounded-box"
              priority={images && images.indexOf(image) < 2}
            />
          </div>
        )}
      />
    </div>
  );
}

function Masonry({ children, images, onLoadMore, loadAll = false }: Props) {
  return (
    <GalleryBase
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
      layout="masonry"
    >
      {children}
    </GalleryBase>
  );
}

export { Masonry, MasonryLayout };
