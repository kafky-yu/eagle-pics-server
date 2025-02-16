"use client";

import "photoswipe/style.css";
import { Masonry } from "../_components/Masonry";
import { useGalleryImages } from "../_hooks/useGalleryImages";

export default function MasonryGallery() {
  const { images, onLoadMore, loadAll } = useGalleryImages();

  return (
    <Masonry
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
    />
  );
}
