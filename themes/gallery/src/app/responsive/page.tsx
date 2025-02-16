"use client";

import "photoswipe/style.css";
import Responsive from "../_components/Responsive";
import { useGalleryImages } from "../_hooks/useGalleryImages";

export default function ResponsiveGallery() {
  const { images, onLoadMore, loadAll } = useGalleryImages();

  return (
    <Responsive
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
    />
  );
}
