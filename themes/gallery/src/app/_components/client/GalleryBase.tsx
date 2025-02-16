import "photoswipe/style.css";

import { useRef } from "react";
import { useContainerPosition } from "masonic";
import type { DataSourceArray } from "photoswipe";

import type { GalleryImage } from "~/app/types/gallery";
import { useWindowSize } from "~/hooks/useWindowSize";
import { useGalleryLightbox } from "../../_hooks/useGalleryLightbox";
import { useGalleryLoader } from "../../_hooks/useGalleryLoader";
import { MasonryLayout } from "../Masonry";
import { ResponsiveLayout } from "../Responsive";

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

export function ClientGalleryBase({
  images,
  onLoadMore,
  loadAll = false,
  children,
  layout,
}: GalleryBaseProps) {
  const containerRef = useRef(null);
  const [windowWidth, windowHeight] = useWindowSize();

  const { width } = useContainerPosition(containerRef, [
    windowWidth,
    windowHeight,
  ]);

  useGalleryLoader(images, onLoadMore, loadAll);
  const { lightboxRef } = useGalleryLightbox();

  const handleImageClick = (image: GalleryImage) => {
    if (!images) return;
    const index = images.findIndex((img) => img.id === image.id);
    if (index !== -1) {
      const dataSource: DataSourceArray = images.map((img) => ({
        src: img.src,
        w: img.width,
        h: img.height,
        msrc: img.msrc,
      }));
      lightboxRef.current?.loadAndOpen(index, dataSource);
    }
  };

  if (!images) {
    return null;
  }

  const layoutProps = {
    images,
    containerWidth: width,
    windowWidth,
    containerRef,
    onLoadMore,
    onImageClick: handleImageClick,
    loadAll,
  };

  return (
    <div ref={containerRef} className="relative min-h-screen w-full">
      {layout === "masonry" ? (
        <MasonryLayout {...layoutProps} />
      ) : (
        <ResponsiveLayout {...layoutProps} />
      )}
      {children}
    </div>
  );
}
