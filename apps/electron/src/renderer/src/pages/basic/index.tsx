import { useEffect, useMemo, useState } from "react";
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

import { SyncCircle } from "./SyncCircle";

const BtnStatus = {
  1: { disabled: true, text: "无需同步", allowDeleted: true },
  2: { disabled: false, text: "同步", allowDeleted: true },
  3: { disabled: true, text: "同步中...", allowDeleted: false },
  4: { disabled: true, text: "读取中...", allowDeleted: false },
  5: { disabled: true, text: "已开启自动同步", allowDeleted: true },
  6: { disabled: true, text: "初始化中...", allowDeleted: false },
};

const BasicPage = () => {
  const utils = trpc.useUtils();

  const { data: config } = trpc.config.findUnique.useQuery();
  const { data: library } = trpc.library.findUnique.useQuery();
  const { data: libraries } = trpc.library.findMany.useQuery();

  // 订阅文件扫描状态
  trpc.library.onWatch.useSubscription(undefined, {
    onData: async (data) => {
      // 当收到完成状态时，刷新数据
      if (data.status === "completed") {
        await Promise.all([
          utils.library.findUnique.invalidate(),
          utils.library.findMany.invalidate(),
          utils.config.findUnique.invalidate()
        ]);

        // 强制重新获取数据
        await Promise.all([
          utils.library.findUnique.refetch(),
          utils.library.findMany.refetch(),
          utils.config.findUnique.refetch()
        ]);
      }
    }
  });

  // 订阅同步状态
  trpc.sync.onStart.useSubscription(undefined, {
    onData: async (data) => {
      // 当收到完成状态时，刷新数据
      if (data.status === "completed") {
        await Promise.all([
          utils.library.findUnique.invalidate(),
          utils.library.findMany.invalidate(),
          utils.config.findUnique.invalidate()
        ]);

        // 强制重新获取数据
        await Promise.all([
          utils.library.findUnique.refetch(),
          utils.library.findMany.refetch(),
          utils.config.findUnique.refetch()
        ]);
      }
    }
  });

  const switchLibrary = trpc.library.setActive.useMutation({
    onError: (err) => {
      console.error("切换资源库失败:", err);
      window.dialog.showErrorBox("切换资源库失败", err.message);
    },
    onSuccess: async () => {
      // 刷新所有相关查询
      await Promise.all([
        utils.library.findUnique.invalidate(),
        utils.library.findMany.invalidate(),
        utils.config.findUnique.invalidate()
      ]);

    },
  });

  const addWatchLibrary = trpc.library.watch.useMutation();

  const addLibrary = trpc.library.add.useMutation({
    onError: (err) => {
      console.error("添加资源库失败:", err);
      window.dialog.showErrorBox("添加资源库失败", err.message);
    },
    onSuccess: async ({ path }) => {

      // 先刷新库列表，显示新添加的库
      await Promise.all([
        utils.library.findUnique.invalidate(),
        utils.library.findMany.invalidate(),
        utils.config.findUnique.invalidate()
      ]);
      await Promise.all([
        utils.library.findUnique.refetch(),
        utils.library.findMany.refetch(),
        utils.config.findUnique.refetch()
      ]);

      // 然后开始监视目录
      await addWatchLibrary.mutateAsync({ path });

    },
  });

  const openDirectory = async () => {
    try {
      const result = await window.dialog.showOpenDialog({
        properties: ["openDirectory", "showHiddenFiles"],
        title: "选择 Eagle 资源库文件夹",
        buttonLabel: "选择文件夹",
        message: "请选择 .library 结尾的 Eagle 资源库文件夹"
      });

      // 处理可能的数组返回值
      const selectedPath = Array.isArray(result) ? result[0] : undefined;

      if (!selectedPath) {
        return;
      }

      if (!selectedPath.endsWith(".library")) {
        window.dialog.showErrorBox(
          "选择错误",
          "请选择 Eagle 资源库文件夹（以 .library 结尾）"
        );
        return;
      }

      await addLibrary.mutateAsync(selectedPath);
    } catch (err) {
      console.error("添加资源库失败:", err);
    }
  };
  const onStartSync = trpc.sync.start.useMutation({
    onError: (err) => {
      console.error(err);
    },
  });

  const [btnState, setBtnState] = useState<keyof typeof BtnStatus>(6);
  const btn = BtnStatus[btnState];

  useEffect(() => {
    if (config?.autoSync) {
      return setBtnState(5);
    }

    setBtnState(library && library.pendingCount > 0 ? 2 : 1);
  }, [library, config]);

  const site = useMemo(() => {
    if (config) {
      if (config.clientSite) {
        return config.clientSite;
      }

      return `http://${config.ip}:${config.clientPort}`;
    }

    return "";
  }, [config]);

  const onBeforeDeleteLibrary = () => {
    window.dialog
      .showMessageBox({
        type: "question",
        buttons: ["取消", "确认"],
        title: "提示",
        message: "确定要移除此库吗？",
      })
      .then((res) => {
        if (res === 1) {
          void deleteLibrary.mutateAsync();
        }
      })
      .catch((e) =>
        window.dialog.showErrorBox("onBeforeDeleteLibrary", JSON.stringify(e)),
      );
  };
  const deleteLibrary = trpc.library.delete.useMutation({
    onSuccess: () => {
      void utils.library.invalidate();
    },
  });

  return (
    <Content title={<Title>基础信息</Title>} className="min-h-0 flex-1 flex flex-col">
      <div className="px-4 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-base-content/60">
            已添加 {libraries?.length ?? 0} 个资源库
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={openDirectory}
          >
            添加资源库
          </button>
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
                    className="btn btn-sm btn-ghost normal-case max-w-[300px] truncate"
                  >
                    {library?.path?.split("/").pop()?.replace(".library", "") || "未选择"}
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
                    className="dropdown-content menu rounded-box z-[1] max-w-[400px] bg-base-100 p-2 shadow-lg"
                  >
                    {libraries?.map((lib) => (
                      <li key={lib.path}>
                        <button
                          className={`${lib.isActive ? "active" : ""} truncate w-full text-left`}
                          onClick={async () => {
                            if (!lib.isActive) {
                              // 点击后关闭下拉菜单
                              const dropdown = document.activeElement as HTMLElement;
                              dropdown?.blur();
                              await switchLibrary.mutateAsync({ path: lib.path });
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
                      window.shell.showItemInFolder(library.path);
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
                <span className="ml-2 flex items-center">最后同步</span>
              </>
            }
            right={
              library?.lastSyncTime?.toLocaleString("zh", { hour12: false }) ??
              "暂未同步"
            }
          />

          <Row
            left={
              <>
                <PhotoIcon className="h-5 w-5" />
                <span className="ml-2">同步数量</span>
              </>
            }
            right={
              <>
                <span className="text-success">{library?.syncCount ?? 0}</span>
                <span className="mx-1 text-base-content/60">｜</span>
                <span className="text-warning">
                  {library?.unSyncCount ?? 0}
                </span>
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
        </div>

        <div className="mt-4 flex py-3">
          <div className="flex w-1/2 justify-center">
            <SyncCircle
              pendingCount={library?.pendingCount  ?? 0}
              onReadData={(status) => {
                // 读取中
                if (status === "completed") {
                  setBtnState(2);
                } else {
                  btnState != 4 && setBtnState(4);
                }
              }}
              onSyncData={(status) => {
                // 同步中
                if (status === "completed") {
                  setBtnState(1);
                } else {
                  btnState != 3 && setBtnState(3);
                }
              }}
            />
          </div>
          <div className="w-1/2">
            <div className="m-auto flex h-full w-5/6 flex-col justify-center">
              <button
                className="btn btn-neutral"
                disabled={btn.disabled}
                onClick={() => {
                  if (library) {
                    setBtnState(3);

                    onStartSync
                      .mutateAsync({
                        libraryPath: library.path,
                      })
                      .catch((e) => {
                        console.error(e);
                      });
                  }
                }}
              >
                {btn.text}
              </button>
              <button
                disabled={!btn.allowDeleted}
                className="btn btn-outline btn-error mt-4"
                onClick={onBeforeDeleteLibrary}
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
};

export default BasicPage;
