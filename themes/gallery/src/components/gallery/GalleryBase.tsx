"use client";

import "photoswipe/style.css";

import { useEffect, useRef, useState } from "react";
import type { DataSourceArray } from "photoswipe";

import type { GalleryImage } from "./types/gallery";
import { useWindowSize } from "~/hooks/useWindowSize";
import { useGalleryLightbox } from "~/hooks/useGalleryLightbox";
import { useGalleryLoader } from "~/hooks/useGalleryLoader";
import { MasonryLayout } from "./Masonry";
import { ResponsiveLayout } from "./Responsive";

export interface GalleryBaseProps {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
  layout: "masonry" | "responsive";
}

export const ImageSkeleton = () => (
  <div
    className="animate-pulse rounded-box bg-gray-200 shadow"
    style={{ height: "200px" }}
  />
);

export function GalleryBase({
  images,
  onLoadMore,
  loadAll = false,
  children,
  layout,
}: GalleryBaseProps) {
  const { lightboxRef } = useGalleryLightbox();
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth] = useWindowSize();
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [windowWidth]);

  useGalleryLoader(images, onLoadMore, loadAll);

  const handleImageClick = (image: GalleryImage) => {
    if (!images) return;
    const dataSource = images.map((image) => {
      const item: DataSourceArray[number] = {
        src: image.src,
        width: image.width,
        height: image.height,
        msrc: image.msrc,
        id: image.id,
      };

      switch (image.type) {
        case "video":
          // For video slides, PhotoSwipe requires an `html` property that contains the video tag.
          item.html = `<div class="pswp__video-container"><video src="${image.src}" class="pswp__video" controls loop></video></div>`;
          // `src` is not used for video slides, but it's good to keep it for consistency or fallbacks.
          delete item.src;
          break;
        case "audio":
          // For audio slides, we provide an `html` property with an audio tag.
          item.html = `<div class="pswp__audio-container" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;"><audio src="${image.src}" controls></audio></div>`;
          // Audio slides don't have a visual, so we can remove src to prevent PhotoSwipe from trying to load it as an image.
          delete item.src;
          break;
      }

      return item;
    });
    lightboxRef.current?.loadAndOpen(images.indexOf(image), dataSource);
  };

  if (!images) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative min-h-screen w-full">
      {layout === "masonry" ? (
        <MasonryLayout
          images={images}
          onLoadMore={onLoadMore}
          onImageClick={handleImageClick}
          loadAll={loadAll}
        />
      ) : (
        <ResponsiveLayout
          images={images}
          onLoadMore={onLoadMore}
          onImageClick={handleImageClick}
          loadAll={loadAll}
          containerWidth={containerWidth}
          windowWidth={windowWidth}
          containerRef={containerRef}
        />
      )}
      {children}
    </div>
  );
}
