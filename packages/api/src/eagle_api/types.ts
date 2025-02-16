export interface EagleFolder {
  id: string;
  name: string;
  description: string;
  children: EagleFolder[];
  modificationTime: number;
  tags: string[];
  password: string;
  passwordTips: string;
}

export interface EagleLibraryInfo {
  folders: EagleFolder[];
  smartFolders: any[];
  quickAccess: any[];
  tagsGroups: any[];
  modificationTime: number;
  applicationVersion: string;
  library: {
    path: string;
    name: string;
  };
}

export interface EagleItem {
  id: string;
  name: string;
  size: number;
  btime: number;
  mtime: number;
  ext: string;
  tags: string[];
  folders: string[];
  isDeleted: boolean;
  url: string;
  annotation: string;
  modificationTime: number;
  width: number;
  height: number;
  lastModified: number;
  palettes: {
    color: [number, number, number];
    ratio: number;
  }[];
}

export interface EagleFolder {
  id: string;
  name: string;
  description: string;
  children: EagleFolder[];
  modificationTime: number;
  imageCount?: number;
  coverId?: string;
}

export interface SearchParams {
  keyword?: string;
  limit?: number;
  offset?: number;
  orderBy?: string; // CREATEDATE | FILESIZE | NAME | RESOLUTION，反序加上减号 -FILESIZE
  ext?: string;
  tags?: string | string[]; // 支持字符串（用逗号分隔）或字符串数组
  folders?: string | string[]; // 支持字符串（用逗号分隔）或字符串数组
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  message?: string;
  errorCode?: number;
}
