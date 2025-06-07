"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { lightboxOpenState } from "~/states/lightbox";

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

  let items = null;
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

    items = {
      justify: results,
      images: imageResult,
      boxSpacing: BOX_SPACING,
    };
  }

  // 使用 useRef 来跟踪上一次的宽度
  const lastWidthRef = useRef(containerWidth);

  // 更新上一次的宽度
  useEffect(() => {
    lastWidthRef.current = containerWidth;
  }, [containerWidth]);

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
  const {
    images: originalImagesFromProps,
    onLoadMore: originalOnLoadMoreFromProps,
    containerRef: originalContainerRefFromProps,
    containerWidth: currentContainerWidthFromProps,
    windowWidth: currentWindowWidthFromProps,
  } = props;

  const isLightboxOpen = useRecoilValue(lightboxOpenState);
  const [currentActualWindowWidth, currentActualWindowHeight] = useWindowSize(); // Actual current window size

  // Stable dimensions for the layout hook and MasonryScroller key
  // Initialized with values from props or current actual window dimensions
  const [stableContainerWidth, setStableContainerWidth] = useState(currentContainerWidthFromProps || 0);
  const [stableWindowWidth, setStableWindowWidth] = useState(currentWindowWidthFromProps || currentActualWindowWidth);
  const [stableKeyHeight, setStableKeyHeight] = useState(currentActualWindowHeight); // For MasonryScroller key

  // Prepare props for useResponsiveLayout, using stable dimensions when lightbox is open
  const layoutHookProps = useMemo(() => ({
    ...props,
    containerWidth: stableContainerWidth,
    windowWidth: stableWindowWidth, // This is for positioner's columnGutter
  }), [props, stableContainerWidth, stableWindowWidth]);

  const { items, onRender, positioner } = useResponsiveLayout(layoutHookProps);

  const setting = useRecoilValue(settingSelector);
  const search = useSearchParams();
  //这里拿到当前的文件夹id
  const folderId = search.get("m") ?? "";


  useEffect(() => {
    if (!isLightboxOpen) {
      setStableContainerWidth(currentContainerWidthFromProps || 0);
      setStableWindowWidth(currentWindowWidthFromProps || currentActualWindowWidth);
      setStableKeyHeight(currentActualWindowHeight);
    } else {
      // If lightbox opens and stable values were uninitialized (e.g. 0), capture current prop values once.
      if (stableContainerWidth === 0 && currentContainerWidthFromProps) {
        setStableContainerWidth(currentContainerWidthFromProps);
      }
      if (stableWindowWidth === 0 && (currentWindowWidthFromProps || currentActualWindowWidth)) {
        setStableWindowWidth(currentWindowWidthFromProps || currentActualWindowWidth);
      }
      // stableKeyHeight is based on currentActualWindowHeight, less likely to be 0 if window size is available.
      if (stableKeyHeight === 0 && currentActualWindowHeight) { // Assuming 0 is an invalid/uninit height
        setStableKeyHeight(currentActualWindowHeight);
      }
    }
  }, [
    isLightboxOpen,
    currentContainerWidthFromProps,
    currentWindowWidthFromProps,
    currentActualWindowWidth,
    currentActualWindowHeight,
    stableContainerWidth, // Dependency to allow one-time update
    stableWindowWidth,    // Dependency to allow one-time update
    stableKeyHeight       // Dependency to allow one-time update
  ]);
  const { offset } = useContainerPosition(originalContainerRefFromProps, [
    currentActualWindowWidth, // Offset calculation should use actual current dimensions
    currentActualWindowHeight,
  ]);

  // 只在文件夹页面时自动加载更多
  useEffect(() => {
    // Only auto load more in folder view AND when lightbox is NOT open
    if (!originalImagesFromProps || !folderId || isLightboxOpen) return;
    originalOnLoadMoreFromProps();
  }, [originalImagesFromProps, originalOnLoadMoreFromProps, folderId, isLightboxOpen]);

    // If containerWidth from props is not yet available (e.g., initial render), don't render MasonryScroller
  if (!currentContainerWidthFromProps || currentContainerWidthFromProps === 0) return null;
  if (!items) return null;

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
      <MasonryScroller
        key={`${stableWindowWidth}-${stableKeyHeight}`}
        onRender={onRender}
        positioner={positioner}
        height={currentActualWindowHeight}
        offset={offset}
        containerRef={originalContainerRefFromProps}
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
                      data-pswp-type={image.type}
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
