import * as qs from "qs";

import type {
  ApiResponse,
  EagleFolder,
  EagleItem,
  EagleLibraryInfo,
  SearchParams,
} from "./types";

export class EagleService {
  private readonly baseUrl: string;
  // private readonly apiToken?: string;

  constructor() {
    const port = process.env.EAGLE_API_PORT ?? "41595";
    this.baseUrl = `http://localhost:${port}/api`;
    // this.apiToken = process.env.EAGLE_API_TOKEN;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<T>;
    if (result.status === "error") {
      throw new Error(result.message ?? `API error! code: ${result.errorCode}`);
    }

    return result.data;
  }

  //获取当前图库的信息
  async getLibraryInfo(): Promise<EagleLibraryInfo> {
    return this.request<EagleLibraryInfo>("/library/info");
  }

  //获取图库历史
  async getLibraryList(): Promise<{ path: string; isActive: boolean }[]> {
    const path_list = await this.request<string[]>("/library/history");
    const active_library_path = await this.getLibraryInfo();
    return path_list
      .filter((lib) => !lib.endsWith("/"))
      .map((lib) => ({
        path: lib,
        isActive: lib === active_library_path.library.path,
      }));
  }

  // 切换图库
  async switchLibrary(libraryPath: string): Promise<void> {
    const data = {
      libraryPath,
    };
    return this.request<void>("/library/switch", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // 获取图片列表
  async getItems(params: SearchParams = {}): Promise<EagleItem[]> {
    return this.request<EagleItem[]>(`/item/list?${qs.stringify(params)}`, {
      method: "GET",
    });
  }

  // 获取图片列表
  async getItemById(id: string): Promise<EagleItem> {
    return this.request<EagleItem>(`/item/info?id=${id}`, {
      method: "GET",
    });
  }

  // 获取文件夹列表
  async getFolders(): Promise<EagleFolder[]> {
    const folders = await this.request<EagleFolder[]>(`/folder/list`, {
      method: "GET",
    });

    return flatToTree<(typeof folders)[number]>(folders);
  }

  // 获取缩略图URL
  async getThumbnail(id: string): Promise<string> {
    const response = await this.request<string>(`/item/thumbnail?id=${id}`);

    return response;
  }

  // 获取原始图片URL
  async getOriginalImage(id: string): Promise<string> {
    const thumbnail: string = await this.request(`/item/thumbnail?id=${id}`);
    const item_data = await this.request<EagleItem>(`/item/info?id=${id}`);

    const ext = item_data.ext;

    return thumbnail.replace("_thumbnail.png", `.${ext}`);
  }

  async getFolderItems(
    folderId: string,
    params: Omit<SearchParams, "folderId"> = {},
  ): Promise<EagleItem[]> {
    return this.getItems({
      ...params,
      folders: folderId,
    });
  }
}

export const eagleService = new EagleService();

function flatToTree<T extends { id: string | number; children: T[] }>(
  folders: T[],
): T[] {
  return folders.map((folder) => {
    return {
      ...folder,
      children: folder.children ? flatToTree(folder.children) : [],
    };
  });
}
