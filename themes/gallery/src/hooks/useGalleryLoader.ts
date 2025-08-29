import { useEffect, useRef } from "react";

import type { GalleryImage } from "~/components/gallery/types/gallery";

export const GALLERY_LIMIT = 30;

export function useGalleryLoader(
  images: GalleryImage[] | undefined,
  onLoadMore: () => void,
  loadAll = false,
) {
  const batchCountRef = useRef(0);
  const lastImagesLengthRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!images) return;

    // 只在文件夹页面时自动加载所有数据
    if (loadAll) {
      // 检查是否有新数据加载
      if (images.length > lastImagesLengthRef.current) {
        lastImagesLengthRef.current = images.length;
        batchCountRef.current++;
        console.log(
          `加载批次 ${batchCountRef.current}，当前数据量：${images.length}`,
        );

        // 如果数据量是 GALLERY_LIMIT 的整数倍，说明可能还有更多数据
        if (images.length % GALLERY_LIMIT === 0 && !loadingRef.current) {
          loadingRef.current = true;
          // 使用 requestAnimationFrame 来避免频繁触发
          requestAnimationFrame(() => {
            onLoadMore();
            // 给一个合理的间隔再重置状态
            setTimeout(() => {
              loadingRef.current = false;
            }, 500);
          });
        }
      }
    }
    // 非文件夹页面不自动加载，依赖 Masonic 的滚动加载
  }, [images, onLoadMore, loadAll]);

  return { limit: GALLERY_LIMIT };
}
