import type { EXT } from "@rao-pics/constant";

export interface GalleryImage {
  id: string;
  src: string;
  thumbnailPath: string;
  bgColor: string;
  width: number;
  height: number;
  ext: typeof EXT;
  type: string;
  msrc: string;
}

export interface LayoutProps {
  images?: GalleryImage[];
  containerWidth?: number;
  windowWidth?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  onLoadMore: () => void;
  onImageClick?: (image: GalleryImage) => void;
  loadAll?: boolean;
}
