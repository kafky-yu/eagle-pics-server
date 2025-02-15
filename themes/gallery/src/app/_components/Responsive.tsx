"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/legacy/image";
import justifyLayout from "justified-layout";
import {
  MasonryScroller,
  useContainerPosition,
  useInfiniteLoader,
  usePositioner,
} from "masonic";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import { useRecoilValue } from "recoil";

import { VIDEO_EXT } from "@rao-pics/constant";
import type { EXT } from "@rao-pics/constant";

import { settingSelector } from "~/states/setting";
import initLightboxVideoPlugin from "~/utils/photoswipe-video";

import "photoswipe/style.css";

import { useWindowSize } from "~/hooks/useWindowSize";

type JustifyLayoutResult = ReturnType<typeof justifyLayout>;

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

  // 是否直接加载所有图片，如果为 true，则会一直加载直到没有更多图片
  loadAll?: boolean;

  children?: React.ReactNode;
}

const ImageSkeleton = () => (
  <div
    className="animate-pulse rounded-box bg-gray-200 shadow"
    style={{ height: "240px" }}
  />
);

function Responsive({ children, images, onLoadMore, loadAll = false }: Props) {
  const limit = 30; // 减少每页加载数量以提高性能
  const containerRef = useRef(null);
  const [windowWidth, windowHeight] = useWindowSize();
  const setting = useRecoilValue(settingSelector);

  const { offset, width } = useContainerPosition(containerRef, [
    windowWidth,
    windowHeight,
  ]);

  const items = useMemo(() => {
    if (images && width) {
      const results: JustifyLayoutResult[] = [];
      const imageTemp = JSON.parse(JSON.stringify(images)) as typeof images;
      const imageResult: (typeof images)[] = [];

      while (imageTemp.length > 0) {
        const result = justifyLayout(imageTemp, {
          maxNumRows: 1,
          containerWidth: width,
          containerPadding: 0,
          boxSpacing: 12,
          targetRowHeight: 240,
        });

        imageResult.push(imageTemp.splice(0, result.boxes.length));
        results.push(result);
      }

      return {
        justify: results,
        images: imageResult,
      };
    }

    return null;
  }, [images, width]);

  const positioner = usePositioner(
    {
      width: width,
      columnGutter: windowWidth < 768 ? 8 : 12,
      columnCount: 1,
    },
    [images],
  );

  const onRender = useInfiniteLoader(onLoadMore, {
    minimumBatchSize: limit,
    threshold: 4, // 增加预加载的视口数量
  });

  // 处理图片加载逻辑
  useEffect(() => {
    if (!images) return;

    // 如果是 loadAll 模式，则一直加载直到没有更多图片
    if (loadAll) {
      console.log("加载所有图片模式");
      onLoadMore();
    }
    // 如果不是 loadAll 模式，只在内容不足一页时加载
    else if (images.length < limit) {
      console.log("内容不足一页，加载更多");
      onLoadMore();
    }
  }, [images, onLoadMore, loadAll, limit]);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null,
  );
  const autoPlayIntervalRef = useRef<NodeJS.Timeout>();
  const lightboxRef = useRef<PhotoSwipeLightbox>();

  // 初始化 lightbox
  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      pswpModule: () => import("photoswipe"),
      loop: false,
    });

    initLightboxVideoPlugin(lightbox);
    lightbox.init();

    // 监听 lightbox 关闭事件
    lightbox.on("close", () => {
      setIsAutoPlaying(false);
      setCurrentImageIndex(null);
    });

    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  // 处理自动播放
  useEffect(() => {
    if (!images || !lightboxRef.current) return;

    if (isAutoPlaying) {
      autoPlayIntervalRef.current = setInterval(() => {
        lightboxRef.current?.pswp?.next();
      }, 5000);
    } else if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, images]);

  // 创建一个自动播放按钮并添加到 PhotoSwipe 的根元素中
  useEffect(() => {
    // 等待 PhotoSwipe 初始化完成
    setTimeout(() => {
      const pswpElement = document.querySelector(".pswp");
      if (!pswpElement) return;

      // 创建按钮容器
      let buttonContainer = pswpElement.querySelector(".auto-play-button");
      if (!buttonContainer) {
        buttonContainer = document.createElement("div");
        buttonContainer.className =
          "auto-play-button absolute top-4 left-[10%] z-[9999]";
        pswpElement.appendChild(buttonContainer);
      }

      // 更新按钮内容
      buttonContainer.innerHTML = `
        <button
          class="rounded-full p-2 transition-colors bg-black/30 hover:bg-black/50 text-white"
          style="backdrop-filter: blur(8px);"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            ${
              isAutoPlaying
                ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />' // 暂停图标
                : '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />' // 播放图标
            }
          </svg>
        </button>
      `;

      // 添加点击事件
      const button = buttonContainer.querySelector("button");
      if (button) {
        button.onclick = () => setIsAutoPlaying(!isAutoPlaying);
      }
    }, 100);
  }, [currentImageIndex, isAutoPlaying]);

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
            height={windowHeight}
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
                        <a
                          href={image.src}
                          key={image.id}
                          data-pswp-width={image.width}
                          data-pswp-height={image.height}
                          data-pswp-type={
                            VIDEO_EXT.includes(image.ext) ? "video" : "image"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="relative block overflow-hidden rounded-box shadow"
                          style={{
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                            position: "absolute",
                            top: `${box.top}px`,
                            left: `${box.left}px`,
                            backgroundColor: image.bgColor + "0C",
                          }}
                          onClick={(e) => {
                            e.preventDefault();

                            const curIndex = images?.findIndex(
                              (item) => item.id === image.id,
                            );

                            setCurrentImageIndex(curIndex ?? 0);
                            lightboxRef.current?.loadAndOpen(
                              curIndex ?? 0,
                              images ?? [],
                            );
                          }}
                        >
                          {setting.showFileName && (
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                              {image.src.split("/").pop()}
                            </div>
                          )}
                          <Image src={image.thumbnailPath} layout="fill" />
                        </a>
                      )
                    );
                  })}
                </div>
              );
            }}
          />
          {children}
        </>
      )}
    </main>
  );
}

export default Responsive;
