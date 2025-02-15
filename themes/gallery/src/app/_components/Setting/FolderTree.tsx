import { useRouter, useSearchParams } from "next/navigation";
import { FolderMinusIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { useRecoilState } from "recoil";

import { settingSelector } from "~/states/setting";

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
      <li className="flex justify-between">
        <div
          className="flex justify-between"
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            if (folderId === data.id) {
              return;
            }
            void router.push(`/${layout}?m=${data.id}`);
          }}
        >
          <span className="flex items-center">
            {<FolderMinusIcon className="mr-1 h-5 w-5" />}

            {data.name}
          </span>

          <span className="text-sm font-normal text-base-content/30">{0}</span>
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
      <li>
        <details
          open={open}
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            setSetting((prev) => ({
              ...prev,
              openFolderIds: prev.openFolderIds.includes(data.id)
                ? prev.openFolderIds.filter((id) => id !== data.id)
                : [...prev.openFolderIds, data.id],
            }));
          }}
        >
          <summary className="relative flex">
            <div
              className="absolute left-0 top-0 z-50 h-full w-10/12"
              aria-hidden
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                if (folderId === data.id) {
                  return;
                }

                void router.push(`/${layout}?m=${data.id}`);
              }}
            />
            <div className="flex flex-1 items-center">
              {<FolderOpenIcon className="mr-1 h-5 w-5" />}

              {data.name}
            </div>
            <span className="text-sm text-base-content/30">{open}</span>
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
    <>
      <ul className="menu w-full font-mono text-base">
        {data.map((item) => {
          if (!item.children?.length) {
            return <Document key={item.id} data={item} />;
          } else {
            return <FolderRoot key={item.id} data={item} />;
          }
        })}
      </ul>
    </>
  );
}

export default FolderTree;
