"use client";

import { useEffect, useRef } from "react";
import Image from "next/legacy/image";
import {
  MasonryScroller,
  useContainerPosition,
  useInfiniteLoader,
  usePositioner,
} from "masonic";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import { useRecoilValue } from "recoil";

import type { EXT } from "@rao-pics/constant";

import { settingSelector } from "~/states/setting";
import initLightboxVideoPlugin from "~/utils/photoswipe-video";

import "photoswipe/style.css";

import { useWindowSize } from "~/hooks/useWindowSize";

interface Props {
  images?: {
    id: string;
    src: string;
    thumbnailPath: string;
    bgColor: string;
    width: number;
    height: number;
    ext: typeof EXT;
    type: string;
    msrc: string;
  }[];

  onLoadMore: () => void;

  children?: React.ReactNode;
}

const ImageSkeleton = () => (
  <div
    className="animate-pulse rounded-box bg-gray-200 shadow"
    style={{ height: "200px" }}
  />
);

function Masonry({ children, onLoadMore, images }: Props) {
  const limit = 30; // 减少每页加载数量以提高性能
  const containerRef = useRef(null);
  const [windowWidth, windowHeight] = useWindowSize();
  const setting = useRecoilValue(settingSelector);

  const { offset, width } = useContainerPosition(containerRef, [
    windowWidth,
    windowHeight,
  ]);

  const positioner = usePositioner(
    {
      width,
      columnGutter: windowWidth < 768 ? 8 : 12,
      rowGutter: windowWidth < 768 ? 8 : 12,
      columnWidth: windowWidth < 768 ? windowWidth / 3 : 224,
    },
    [images],
  );

  const onRender = useInfiniteLoader(onLoadMore, {
    minimumBatchSize: limit,
    threshold: 2, // 提前2个视口高度开始加载
  });

  // 初始加载时如果内容不足一页，自动加载更多
  useEffect(() => {
    if (images && images.length < limit) {
      onLoadMore();
    }
  }, [images, onLoadMore]);

  const lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
    pswpModule: () => import("photoswipe"),
    loop: false,
  });

  initLightboxVideoPlugin(lightbox);
  lightbox.init();

  return (
    <main className="p-2 md:p-3" id="photo-swipe-lightbox">
      {!images || images.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <ImageSkeleton key={index} />
          ))}
          {children}
        </div>
      ) : (
        <>
          <MasonryScroller
            onRender={onRender}
            positioner={positioner}
            offset={offset}
            height={500}
            containerRef={containerRef}
            items={images}
            itemKey={(data) => data.id}
            render={({ data, width: w, index }) => {
              const m = data.width / w;
              const h = data.height / m;

              return (
                <a
                  className="relative block rounded-box shadow"
                  href={data.src}
                  style={{
                    backgroundColor: data.bgColor + "0C",
                    height: h,
                  }}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.preventDefault();

                    lightbox.loadAndOpen(index, images ?? []);
                  }}
                >
                  {setting.showFileName && (
                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                      {data.src.split("/").pop()}
                    </div>
                  )}
                  <Image
                    src={data.thumbnailPath}
                    layout="fill"
                    className="rounded-box"
                  />
                </a>
              );
            }}
          />
          {children}
        </>
      )}
    </main>
  );
}

export default Masonry;
