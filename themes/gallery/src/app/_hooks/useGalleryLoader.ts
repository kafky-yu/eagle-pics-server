import { useEffect, useRef } from "react";

import type { GalleryImage } from "~/app/types/gallery";

export const GALLERY_LIMIT = 30;

export function useGalleryLoader(
  images: GalleryImage[] | undefined,
  onLoadMore: () => void,
  loadAll = false,
) {
  const batchCountRef = useRef(0);
  const lastImagesLengthRef = useRef(0);

  useEffect(() => {
    if (!images) return;

    if (loadAll) {
      // 检查是否有新数据加载
      if (images.length > lastImagesLengthRef.current) {
        lastImagesLengthRef.current = images.length;
        batchCountRef.current++;
        console.log(
          `加载批次 ${batchCountRef.current}，当前数据量：${images.length}`,
        );

        // 如果数据量是 GALLERY_LIMIT 的整数倍，说明可能还有更多数据
        if (images.length % GALLERY_LIMIT === 0) {
          onLoadMore();
        }
      }
    } else if (images.length < GALLERY_LIMIT) {
      console.log("内容不足一页，加载更多");
      onLoadMore();
    }
  }, [images, onLoadMore, loadAll]);

  return { limit: GALLERY_LIMIT };
}
