import { atom, selector } from "recoil";

export interface SettingType {
  layout: "masonry" | "responsive";
  orderBy: {
    mtime?: "asc" | "desc";
    modificationTime?: "asc" | "desc";
    name?: "asc" | "desc";
    // 是否使用前端排序，如果为 true，则不会重新请求数据
    clientSort?: boolean;
  };
  openFolderIds: string[];
  count: number;
  trashCount: number;
  shuffle?: boolean;
  currentLibrary?: string;
  showFileName?: boolean;
}

export const defaultSetting: SettingType = {
  layout: "masonry",
  orderBy: {
    modificationTime: "desc",
  },
  openFolderIds: [],
  count: 0,
  trashCount: 0,
  shuffle: false,
  showFileName: false,
};

const settingAtom = atom({
  key: "settingState",
  default: defaultSetting,
});

export const settingSelector = selector({
  key: "settingSelector",
  get: ({ get }) => {
    return get(settingAtom);
  },
  set: ({ set }, newSetting) => {
    localStorage.setItem("setting", JSON.stringify(newSetting));
    set(settingAtom, newSetting);
  },
});
