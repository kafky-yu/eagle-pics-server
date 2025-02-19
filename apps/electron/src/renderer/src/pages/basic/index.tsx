import { useMemo } from "react";
import {
  ClockIcon,
  EyeIcon,
  FolderIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import Content from "@renderer/components/Content";
import Row from "@renderer/components/Row";
import Title from "@renderer/components/Title";
import { QRCodeSVG } from "qrcode.react";

import { trpc } from "@rao-pics/trpc";

const BasicPage = () => {
  const utils = trpc.useUtils();

  const { data: config } = trpc.config.findUnique.useQuery();
  const { data: library } = trpc.eagle.getLibraryInfo.useQuery();
  const { data: libraries } = trpc.eagle.getLibraryList.useQuery();

  const createFolders = trpc.eagle.createFolders.useMutation({
    onSuccess: async () => {
      await window.dialog.showMessageBox({
        type: "info",
        message: "文件夹同步完成",
      });
    },
    onError: (err) => {
      void window.dialog.showErrorBox("同步文件夹失败", err.message);
    },
  });

  const switchLibrary = trpc.eagle.switchLibrary.useMutation({
    onError: (err) => {
      console.error("切换资源库失败:", err);
      window.dialog.showErrorBox("切换资源库失败", err.message);
    },
    onSuccess: async () => {
      // 刷新所有相关查询
      await Promise.all([
        utils.eagle.getLibraryInfo.invalidate(),
        utils.eagle.getLibraryList.invalidate(),
        utils.config.findUnique.invalidate(),
      ]);
    },
  });

  const site = useMemo(() => {
    if (config) {
      if (config.clientSite) {
        return config.clientSite;
      }

      return `http://${config.ip}:${config.clientPort}`;
    }

    return "";
  }, [config]);

  return (
    <Content
      title={<Title>基础信息</Title>}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col px-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-base-content/60">
            已添加 {libraries?.length ?? 0} 个资源库
          </div>
        </div>
        <div className="card-wrapper">
          <Row
            left={
              <>
                <FolderIcon className="h-5 w-5" />
                <span className="ml-2">资源库</span>
              </>
            }
            right={
              <div className="flex items-center gap-2">
                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="btn btn-ghost btn-sm max-w-[300px] truncate normal-case"
                  >
                    {library?.library.name ?? "无资源库"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="ml-1 h-4 w-4 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                      />
                    </svg>
                  </label>
                  <ul
                    tabIndex={0}
                    className="menu dropdown-content z-[1] max-w-[400px] rounded-box bg-base-100 p-2 shadow-lg"
                  >
                    {libraries?.map((lib) => (
                      <li key={lib.path}>
                        <button
                          className={`${
                            lib.isActive ? "active" : ""
                          } w-full truncate text-left`}
                          onClick={async () => {
                            if (!lib.isActive) {
                              // 点击后关闭下拉菜单
                              const dropdown =
                                document.activeElement as HTMLElement;
                              dropdown?.blur();
                              await switchLibrary.mutateAsync({
                                libraryPath: lib.path,
                              });
                            }
                          }}
                        >
                          {lib.path.split("/").pop()?.replace(".library", "")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    if (library) {
                      window.shell.showItemInFolder(library.library.path);
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </button>
              </div>
            }
          />

          <Row
            left={
              <>
                <ClockIcon className="h-5 w-5" />
                <span className="ml-2 flex items-center">最后修改</span>
              </>
            }
            right={
              <>
                {library?.modificationTime
                  ? new Date(library.modificationTime).toLocaleString("zh-CN", {
                      hour12: false,
                    })
                  : ""}
              </>
            }
          />

          <Row
            left={
              <>
                <PhotoIcon className="h-5 w-5" />
                <span className="ml-2">图片总数</span>
              </>
            }
            right={
              <>
                <span className="text-success">{0}</span>
              </>
            }
          />
        </div>

        <div className="card-wrapper relative mt-4">
          <Row
            left={
              <>
                <div className="rounded-box bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 text-white">
                  <EyeIcon className="h-4 w-4" />
                </div>
                <span className="ml-2 flex items-center">预览</span>
              </>
            }
            right={
              config && (
                <div className="dropdown dropdown-hover">
                  <div role="button" tabIndex={0}>
                    {site}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="dropdown-content right-0 rounded-box bg-base-100 p-4 shadow-md"
                  >
                    <QRCodeSVG value={site} />
                  </div>
                </div>
              )
            }
            onRightClick={() => {
              void window.shell.openExternal(site);
            }}
          />

          <Row
            left={
              <>
                <div className="rounded-box bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <span className="ml-2 flex items-center">同步</span>
              </>
            }
            right={
              <button
                className={`btn btn-sm border-0 ${createFolders.isPending ? 'bg-base-200 text-base-content' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600'}`}
                onClick={() => createFolders.mutate()}
                disabled={createFolders.isPending}
              >
                {createFolders.isPending ? "同步中..." : "同步文件夹"}
              </button>
            }
          />
        </div>
      </div>
    </Content>
  );
};

export default BasicPage;
