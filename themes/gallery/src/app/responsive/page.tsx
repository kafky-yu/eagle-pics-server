"use client";

import "photoswipe/style.css";

import { Responsive } from "~/components/gallery/Responsive";
import { useGalleryImages } from "~/hooks/useGalleryImages";

export default function ResponsiveGallery() {
  const { images, onLoadMore, loadAll } = useGalleryImages();

  return (
    <Responsive images={images} onLoadMore={onLoadMore} loadAll={loadAll} />
  );
}
