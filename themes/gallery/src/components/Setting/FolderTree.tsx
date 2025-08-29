import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderMinusIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { useRecoilState } from "recoil";

import { settingSelector } from "~/states/setting";
import styles from "./FolderTree.module.css";

interface Folder {
  name: string;
  id: string;
  description: string | null;
  children?: Folder[];
}

interface FileTreeProps {
  data: Folder[];
}

// 递归计算文件夹总数
// function countFolder(data: Folder[]): number {
//   const count = 0;
//   // data.forEach((item) => {
//   //   count += item._count.images;
//   //   if (item.children?.length) {
//   //     count += countFolder(item.children);
//   //   }
//   // });
//   return count;
// }

function FolderTree({ data }: FileTreeProps) {
  const [setting, setSetting] = useRecoilState(settingSelector);
  const router = useRouter();

  const { layout, openFolderIds } = setting;

  const search = useSearchParams();
  const folderId = search.get("f") ?? "";

  const Document = ({ data }: { data: Folder }) => {
    return (
      <li className="w-full">
        <div
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-base-200 ${
            folderId === data.id ? "bg-base-200" : ""
          }`}
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            if (folderId === data.id) {
              return;
            }
            void router.push(`/${layout}?m=${data.id}`);
          }}
          title={data.name}
        >
          <div className="z-[51] flex flex-1 items-center overflow-hidden">
            <div className="h-8 w-8" />
            <div className="flex items-center gap-2">
              <FolderMinusIcon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{data.name}</span>
            </div>
          </div>

          <span className="ml-2 flex-shrink-0 text-sm font-normal text-base-content/30">
            {0}
          </span>
        </div>
      </li>
    );
  };

  // 父级文件夹
  const FolderRoot = ({ data }: { data: Folder }) => {
    // const childCount = countFolder(data.children ?? []);
    // const allCount = data._count.images + (childCount ?? 0);

    const open = openFolderIds?.includes(data.id);

    return (
      <li className="w-full">
        <details open={open}>
          <summary
            className="relative flex cursor-pointer items-center rounded-lg px-2 py-1 hover:bg-base-200"
            onClick={(e) => {
              // 阻止 details 的默认展开/收起行为
              e.preventDefault();
            }}
          >
            <button
              type="button"
              className={`absolute left-0 top-0 z-50 h-full w-full focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                folderId === data.id ? "rounded-lg bg-base-200" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                if (folderId === data.id) {
                  return;
                }

                void router.push(`/${layout}?m=${data.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (folderId !== data.id) {
                    void router.push(`/${layout}?m=${data.id}`);
                  }
                }
              }}
              aria-label={`选择文件夹 ${data.name}`}
              aria-current={folderId === data.id ? "true" : undefined}
            />
            <div className="z-[51] flex flex-1 items-center overflow-hidden">
              {data.children?.length ? (
                <button
                  type="button"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-base-300/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    setSetting((prev) => ({
                      ...prev,
                      openFolderIds: prev.openFolderIds.includes(data.id)
                        ? prev.openFolderIds.filter((id) => id !== data.id)
                        : [...prev.openFolderIds, data.id],
                    }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSetting((prev) => ({
                        ...prev,
                        openFolderIds: prev.openFolderIds.includes(data.id)
                          ? prev.openFolderIds.filter((id) => id !== data.id)
                          : [...prev.openFolderIds, data.id],
                      }));
                    }
                  }}
                  aria-label={`${open ? "收起" : "展开"}文件夹 ${data.name}`}
                >
                  {open ? (
                    <ChevronDownIcon className="h-5 w-5 flex-shrink-0 text-base-content/50" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-base-content/50" />
                  )}
                </button>
              ) : (
                <div className="h-8 w-8" />
              )}
              <div className="flex items-center gap-2">
                <FolderOpenIcon className="h-5 w-5 flex-shrink-0" />
                <button
                  type="button"
                  className="truncate text-left hover:bg-base-200 rounded px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (folderId !== data.id) {
                      void router.push(`/${layout}?m=${data.id}`);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (folderId !== data.id) {
                        void router.push(`/${layout}?m=${data.id}`);
                      }
                    }
                  }}
                  aria-label={`查看文件夹 ${data.name} 中的文件`}
                >
                  {data.name}
                </button>
              </div>
            </div>
          </summary>
          <ul>
            {data.children?.map((item) => {
              if (!item.children?.length) {
                return <Document key={item.id} data={item} />;
              } else {
                return <FolderRoot key={item.id} data={item} />;
              }
            })}
          </ul>
        </details>
      </li>
    );
  };

  return (
    <div className="w-full overflow-hidden">
      <ul
        className={`menu w-full space-y-1 font-mono text-base ${styles.folderMenu}`}
      >
        {data.map((item) => {
          if (!item.children?.length) {
            return <Document key={item.id} data={item} />;
          } else {
            return <FolderRoot key={item.id} data={item} />;
          }
        })}
      </ul>
    </div>
  );
}

export default FolderTree;
