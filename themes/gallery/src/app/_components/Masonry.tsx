"use client";

import { useRef } from "react";
import Image from "next/legacy/image";
import { useRecoilValue } from "recoil";

import { settingSelector } from "~/states/setting";
import {
  MasonryScroller,
  useContainerPosition,
  useInfiniteLoader,
  usePositioner,
} from "masonic";
import PhotoSwipeLightbox from "photoswipe/lightbox";

import type { EXT } from "@rao-pics/constant";

import initLightboxVideoPlugin from "~/utils/photoswipe-video";

import "photoswipe/style.css";

import { useWindowSize } from "~/hooks/useWindowSize";

interface Props {
  images?: {
    id: number;
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

function Masonry({ children, onLoadMore, images }: Props) {
  const limit = 50;
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

  const onRender = useInfiniteLoader(onLoadMore, { minimumBatchSize: limit });

  const lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
    pswpModule: () => import("photoswipe"),
    loop: false,
  });

  initLightboxVideoPlugin(lightbox);
  lightbox.init();

  return (
    <main className="p-2 md:p-3" id="photo-swipe-lightbox">
      <MasonryScroller
        onRender={onRender}
        positioner={positioner}
        offset={offset}
        height={500}
        containerRef={containerRef}
        items={images ?? []}
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
    </main>
  );
}

export default Masonry;
