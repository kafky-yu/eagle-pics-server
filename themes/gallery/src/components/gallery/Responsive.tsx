"use client";

import { useEffect, useMemo } from "react";
import Image from "next/legacy/image";
import { useSearchParams } from "next/navigation";
import justifiedLayout from "justified-layout";
import { useRecoilValue } from "recoil";
import useResizeObserver from "use-resize-observer";

import { settingSelector } from "~/states/setting";
import type { GalleryImage, LayoutProps } from "./types/gallery";
import ChildFolderCardList from "./ChildFolderCardList";
import { GalleryBase } from "./GalleryBase"; // 更新 GalleryBase 的导入路径

interface Props {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
}

function ResponsiveLayout(props: LayoutProps) {
  const { images, onImageClick, onLoadMore, loadAll } = props;
  const setting = useRecoilValue(settingSelector);

  useEffect(() => {
    const handleScroll = () => {
      if (loadAll) return;
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 300
      ) {
        onLoadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, loadAll]);
  const search = useSearchParams();
  const folderId = search.get("m") ?? "";

  // 只在文件夹页面时自动加载更多
  useEffect(() => {
    if (!images || !folderId) return;
    onLoadMore();
  }, [images, onLoadMore, folderId]);

  const { ref: containerRef, width: containerWidth = 0 } =
    useResizeObserver<HTMLDivElement>();

  const validImages = useMemo(() => {
    return images?.filter((img) => img.width > 0 && img.height > 0) ?? [];
  }, [images]);

  const geometry = useMemo(() => {
    if (!containerWidth || validImages.length === 0) {
      return { containerHeight: 0, boxes: [] };
    }
    const aspectRatios = validImages.map((img) => img.width / img.height);
    return justifiedLayout(aspectRatios, {
      containerWidth: containerWidth,
      boxSpacing: 12,
      targetRowHeight: 220,
    });
  }, [validImages, containerWidth]);

  if (!validImages || validImages.length === 0) {
    return (
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
      <div
        style={{
          height: geometry.containerHeight,
          position: "relative",
        }}
      >
        {geometry.boxes.map((box, i) => {
          const image = validImages[i];
          if (!image) return null;
          return (
            <div
              key={image.id}
              className="absolute overflow-hidden rounded-box shadow"
              style={{
                width: `${box.width}px`,
                height: `${box.height}px`,
                top: `${box.top}px`,
                left: `${box.left}px`,
                backgroundColor: image.bgColor,
              }}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
            >
              {setting.showFileName && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                  {image.src.split("/").pop() ?? ""}
                </div>
              )}
              <Image
                src={image.thumbnailPath}
                onClick={() => onImageClick?.(image)}
                layout="fill"
                alt={image.src.split("/").pop() ?? ""}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Responsive({ children, images, onLoadMore, loadAll }: Props) {
  return (
    <GalleryBase
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
      layout="responsive"
    >
      {children}
    </GalleryBase>
  );
}

export { Responsive, ResponsiveLayout };
