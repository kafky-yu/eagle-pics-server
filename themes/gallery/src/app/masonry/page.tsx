"use client";

import "photoswipe/style.css";
import { Masonry } from "~/components/gallery/Masonry";
import { useGalleryImages } from "~/hooks/useGalleryImages";

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
