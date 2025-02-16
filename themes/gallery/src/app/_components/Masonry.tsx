"use client";

import { useEffect, useRef, useState } from "react";
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
import { getFullscreenAPI, getFullscreenPromise } from "~/utils/fullscreen";

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
    style={{ height: "200px" }}
  />
);

function Masonry({ children, onLoadMore, images, loadAll = false }: Props) {
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

  const [_currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null,
  );
  const autoPlayIntervalRef = useRef<NodeJS.Timeout>();
  const lightboxRef = useRef<PhotoSwipeLightbox>();

  // 初始化 lightbox
  useEffect(() => {
    const fullscreenAPI = getFullscreenAPI();

    const lightbox = new PhotoSwipeLightbox({
      pswpModule: () => import("photoswipe"),
      loop: false,
      // 禁用打开/关闭动画
      showAnimationDuration: 0,
      hideAnimationDuration: 0,
      // 由于视口大小在初始化时不可预测，所以不预加载第一张幻灯片
      preloadFirstSlide: false,
      children: "a",
    });

    const getAutoPlayButtonHtml = (playing: boolean) => `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
        class="rounded-full p-2 transition-color text-white"
        style="backdrop-filter: blur(8px);"
      >
        ${
          playing
            ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />' // 暂停图标
            : '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />' // 播放图标
        }
      </svg>
    `;

    const getFullscreenButtonHtml = (fullscreen: boolean) => `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
      class="rounded-full p-2 transition-colors text-white"
      style="backdrop-filter: blur(8px);"
    >
      ${
        fullscreen
          ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />' // 退出全屏图标
          : '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />' // 进入全屏图标
      }
    </svg>
  `;

    lightbox.on("uiRegister", function () {
      //自动播放按钮
      lightbox?.pswp?.ui?.registerElement({
        name: "auto-play-button",
        order: 9,
        isButton: true,
        ariaLabel: "Toggle zoom",
        html: getAutoPlayButtonHtml(false),
        onClick: (event, el) => {
          setIsAutoPlaying((prevState) => {
            const newState = !prevState;
            el.innerHTML = getAutoPlayButtonHtml(newState);
            return newState;
          });
        },
      });

      //全屏按钮
      lightbox?.pswp?.ui?.registerElement({
        name: "fullscreen-button",
        order: 10,
        isButton: true,
        ariaLabel: "Toggle fullscreen",
        html: getFullscreenButtonHtml(false),
        onClick: (event, el) => {
          const pswpElement = document.querySelector(".pswp");

          if (
            pswpElement instanceof HTMLElement &&
            !fullscreenAPI?.isFullscreen()
          ) {
            // 请求fullscreenAPI
            getFullscreenPromise(pswpElement)
              .then(() => (el.innerHTML = getFullscreenButtonHtml(true)))
              .catch((error) => {
                console.warn("全屏API调用有误:", error);
              });
          }

          if (fullscreenAPI?.isFullscreen()) {
            fullscreenAPI.exit();
            el.innerHTML = getFullscreenButtonHtml(false);
          }
        },
      });
    });

    initLightboxVideoPlugin(lightbox);

    // 监听 lightbox 关闭事件
    lightbox.on("close", () => {
      setIsAutoPlaying(false);
      setCurrentImageIndex(null);
      if (fullscreenAPI?.isFullscreen()) {
        fullscreenAPI.exit();
      }
    });

    lightbox.init();

    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []); //这里不要加依赖，否则isAutoPlaying更新就会直接调用这个函数

  // 处理自动播放和按钮状态更新
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

                    setCurrentImageIndex(index);
                    lightboxRef.current?.loadAndOpen(index, images ?? []);
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
