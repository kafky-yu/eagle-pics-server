import { useEffect } from "react";
import type { GalleryImage } from "~/app/types/gallery";

export const GALLERY_LIMIT = 30;

export function useGalleryLoader(
  images: GalleryImage[] | undefined,
  onLoadMore: () => void,
  loadAll = false
) {
  useEffect(() => {
    if (!images) return;

    if (loadAll) {
      console.log("加载所有图片模式");
      onLoadMore();
    } else if (images.length < GALLERY_LIMIT) {
      console.log("内容不足一页，加载更多");
      onLoadMore();
    }
  }, [images, onLoadMore, loadAll]);

  return { limit: GALLERY_LIMIT };
}
