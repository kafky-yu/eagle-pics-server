"use client";

import type { GalleryImage } from "~/app/types/gallery";
import { ClientGalleryBase } from "./client/GalleryBase";

export interface GalleryBaseProps {
  images?: GalleryImage[];
  onLoadMore: () => void;
  loadAll?: boolean;
  children?: React.ReactNode;
  layout: "masonry" | "responsive";
}

export function GalleryBase(props: GalleryBaseProps) {
  return <ClientGalleryBase {...props} />;
}
