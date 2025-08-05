"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import MasonryLayoutComponent from "react-masonry-css";
import { useRecoilValue } from "recoil";

import "../../styles/masonry.css";

import { settingSelector } from "~/states/setting";
import type { GalleryImage, LayoutProps } from "../types/gallery";
import ChildFolderCardList from "./ChildFolderCardList";
import { GalleryBase } from "./GalleryBase";

interface Props {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
}

function MasonryLayout(props: LayoutProps) {
  const { images, onLoadMore, loadAll } = props;

  const setting = useRecoilValue(settingSelector);
  const search = useSearchParams();
  //这里拿到当前的文件夹id
  const folderId = search.get("m") ?? "";

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

  // 只在文件夹页面时自动加载更多
  useEffect(() => {
    if (!images || !folderId) return;
    onLoadMore();
  }, [images, onLoadMore, folderId]);

  const breakpointColumnsObj = {
    default: 5,
    1100: 4,
    700: 3,
    500: 2,
  };

  if (!images) return <div />;

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <ChildFolderCardList folderId={folderId} />
      </div>
      <MasonryLayoutComponent
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {images.map((image) => (
          <div
            key={image.id}
            className="relative mb-4 cursor-pointer overflow-hidden rounded-box shadow"
            data-pswp-width={image.width}
            data-pswp-height={image.height}
            onClick={() => props.onImageClick?.(image)}
            style={{ backgroundColor: image.bgColor }}
          >
            {setting.showFileName && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-2 text-xs text-white">
                {image.src.split("/").pop()}
              </div>
            )}
            <Image
              src={image.thumbnailPath}
              alt={image.src.split("/").pop() ?? ""}
              width={image.width}
              height={image.height}
              className="rounded-box"
              priority={images.indexOf(image) < 10}
            />
          </div>
        ))}
      </MasonryLayoutComponent>
    </div>
  );
}

function Masonry({ children, images, onLoadMore, loadAll = false }: Props) {
  return (
    <GalleryBase
      images={images}
      onLoadMore={onLoadMore}
      loadAll={loadAll}
      layout="masonry"
    >
      {children}
    </GalleryBase>
  );
}

export { Masonry, MasonryLayout };
