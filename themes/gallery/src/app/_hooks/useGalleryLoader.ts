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
      // 如果是加载全部模式，则不断加载直到没有更多数据
      console.log("加载所有图片模式");
      const timer = setTimeout(() => {
        onLoadMore();
      }, 100); // 添加小延时避免请求过快
      return () => clearTimeout(timer);
    } else if (images.length < GALLERY_LIMIT) {
      console.log("内容不足一页，加载更多");
      onLoadMore();
    }
  }, [images, onLoadMore, loadAll]);

  return { limit: GALLERY_LIMIT };
}
