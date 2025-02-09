import * as React from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdjustmentsHorizontalIcon,
  AdjustmentsVerticalIcon,
  ArrowsUpDownIcon,
  DocumentTextIcon,
  ServerIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useRecoilState } from "recoil";

import { IconShuffle } from "~/icons/Icon-Shuffle";
import type { SettingType } from "~/states/setting";
import { settingSelector } from "~/states/setting";
import { trpc } from "~/utils/trpc";
import FolderTree from "./FolderTree";
import styles from "./index.module.css";

const Setting = () => {
  const router = useRouter();
  const [setting, setSetting] = useRecoilState(settingSelector);
  const utils = trpc.useUtils();

  const search = useSearchParams();

  const { data: libraries } = trpc.library.findMany.useQuery();
  const { data: count } = trpc.image.count.useQuery(
    { libraryPath: setting.currentLibrary ?? "" },
    { enabled: !!setting.currentLibrary },
  );

  // 更新图片计数
  React.useEffect(() => {
    if (typeof count === "number") {
      setSetting((prev) => ({
        ...prev,
        count,
      }));
    }
  }, [count, setSetting]);
  const { data: config } = trpc.config.findUnique.useQuery();

  React.useEffect(() => {
    if (libraries) {
      const activeLib = libraries.find((lib) => lib.isActive);
      if (activeLib) {
        // 设置当前储存库
        setSetting((prev) => ({
          ...prev,
          currentLibrary: activeLib.path,
        }));
      }
    }
  }, [libraries, setSetting]);
  const { data: folderTree } = trpc.folder.findTree.useQuery(
    { libraryPath: setting.currentLibrary ?? "" },
    { enabled: !!setting.currentLibrary },
  );

  const handleLayoutChange = (layout: SettingType["layout"]) => {
    setSetting((prev) => ({
      ...prev,
      layout,
    }));

    router.replace(`/${layout}?${search.toString()}`);
  };

  const changeOrderBy = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSetting((prev) => ({
      ...prev,
      orderBy: value.startsWith("name_")
        ? { name: value.replace("name_", "") as "asc" | "desc" }
        : { modificationTime: value as "asc" | "desc" },
    }));
  };

  return (
    <>
      <div className="setting drawer">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <label
            htmlFor="my-drawer"
            className={`btn btn-circle btn-primary drawer-button fixed left-3 top-3 z-50 opacity-50 transition-all ease-in hover:opacity-100 hover:shadow-lg`}
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </label>
        </div>
        <div className="drawer-side z-50">
          <label
            htmlFor="my-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          ></label>
          <div className="min-h-full w-80 bg-base-100 p-4 md:w-96">
            {/* 储存库列表 */}
            <div className="mb-4 rounded-box border border-base-content/10 bg-base-200/30 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <ServerIcon className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium">储存库列表</div>
              </div>
              <div className="space-y-2">
                {libraries?.map((lib) => (
                  <div
                    key={lib.path}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200 ${
                      setting.currentLibrary === lib.path ? "bg-base-200" : ""
                    }`}
                    onClick={() => {
                      setSetting((prev) => ({
                        ...prev,
                        currentLibrary: lib.path,
                      }));

                      // 刷新图片相关查询
                      utils.image.findByFolderId.invalidate();
                      utils.image.find.invalidate();
                      utils.image.findShuffle.invalidate();
                      utils.image.count.invalidate();
                      // 刷新文件夹相关查询
                      utils.folder.findTree.invalidate();

                      // 跳转到对应布局页面
                      router.push(`/${setting.layout}`);
                    }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-sm">
                        {lib?.path?.split("/").pop()?.replace(".library", "") ??
                          "未命名储存库"}
                      </div>
                      <div className="truncate text-xs text-base-content/70">
                        {lib.path || "未知路径"}
                      </div>
                    </div>
                    {setting.currentLibrary === lib.path && (
                      <div className="h-2 w-2 rounded-full bg-primary"> </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-box border border-base-content/10 bg-base-200/30 px-4">
              <div className={styles.row}>
                <span className={styles.rowTitle}>
                  <AdjustmentsVerticalIcon className="mr-1 h-5 w-5" />
                  布局方式
                </span>

                <div className="join">
                  <button
                    onClick={() => handleLayoutChange("masonry")}
                    className={`btn join-item btn-sm font-normal ${
                      setting.layout === "masonry" ? "btn-primary" : ""
                    }`}
                  >
                    瀑布流
                  </button>
                  <button
                    onClick={() => handleLayoutChange("responsive")}
                    className={`btn join-item btn-sm font-normal ${
                      setting.layout === "responsive" ? "btn-primary" : ""
                    }`}
                  >
                    自适应
                  </button>
                </div>
              </div>

              <div className={styles.row}>
                <span className={styles.rowTitle}>
                  <ArrowsUpDownIcon className="mr-1 h-5 w-5" />
                  排序方式
                </span>

                <select
                  value={setting.orderBy.modificationTime}
                  onChange={changeOrderBy}
                  className="select select-sm bg-base-200 font-normal focus:outline-none"
                >
                  <option value={"asc"}>↑ 添加时间</option>
                  <option value={"desc"}>↓ 添加时间</option>
                  <option value={"name_asc"}>↑ 文件名</option>
                  <option value={"name_desc"}>↓ 文件名</option>
                </select>
              </div>
            </div>

            <div className="relative mt-4 rounded-box border border-base-content/10 bg-base-200/30">
              <ul className="menu font-mono text-base">
                <li>
                  <Link
                    href={`/${setting.layout}`}
                    className="flex justify-between"
                  >
                    <span className="flex items-center">
                      <WalletIcon className="mr-1 h-5 w-5" />
                      全部
                    </span>

                    <span className="text-sm text-base-content/30">
                      {setting.count}
                    </span>
                  </Link>
                </li>
                <li>
                  <div className="flex justify-between active:!bg-transparent active:!text-inherit">
                    <span className="flex items-center">
                      <IconShuffle className="mr-1 h-5 w-5" />
                      随机模式
                    </span>

                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={setting.shuffle}
                      onChange={(e) => {
                        setSetting((prev) => ({
                          ...prev,
                          shuffle: e.target.checked,
                        }));
                        router.refresh();
                      }}
                    />
                  </div>
                </li>
                <li>
                  <div className="flex justify-between active:!bg-transparent active:!text-inherit">
                    <span className="flex items-center">
                      <DocumentTextIcon className="mr-1 h-5 w-5" />
                      展示文件名
                    </span>

                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={setting.showFileName}
                      onChange={(e) => {
                        setSetting((prev) => ({
                          ...prev,
                          showFileName: e.target.checked,
                        }));
                      }}
                    />
                  </div>
                </li>
                {config?.trash && (
                  <li>
                    <Link
                      href={`/${setting.layout}?m=trash`}
                      className="flex justify-between"
                    >
                      <span className="flex">
                        <TrashIcon className="mr-1 h-5 w-5" />
                        回收站
                      </span>

                      <span className="text-sm text-base-content/30">
                        {setting.trashCount || null}
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="relative mt-4 rounded-box border border-base-content/10 bg-base-200/30">
              {folderTree && <FolderTree data={folderTree} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Setting;
