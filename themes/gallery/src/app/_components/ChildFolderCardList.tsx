import type { ReactNode } from "react";
import Image from "next/legacy/image";
import { useRouter } from "next/navigation";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { useRecoilValue } from "recoil";

import { settingSelector } from "~/states/setting";
import { trpc } from "~/utils/trpc";

const ChildFolderCardList = ({ folderId }: { folderId: string }) => {
  const router = useRouter();
  const setting = useRecoilValue(settingSelector);

  const { layout } = setting;

  let children = [];
  if (!folderId) {
    children = trpc.eagle.getFolders.useQuery().data ?? [];
  } else {
    const { data: folder } = trpc.eagle.getFolderInfo.useQuery({
      id: folderId,
    });
    children = folder?.children ?? [];
  }

  const covers: string[] = children
    .filter(
      (child): child is typeof child & { coverId: string } =>
        child.coverId !== null && child.coverId !== undefined,
    )
    .map((child) => child.coverId);

  const { data: cover_images } = trpc.eagle.getItemsByIds.useQuery({
    ids: covers,
  });

  const { data: config } = trpc.config.findUnique.useQuery();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {children.map((child) => {
        const Card = (props: { children?: ReactNode }) => {
          return (
            <div
              onClick={() => {
                void router.push(`/${layout}?m=${child.id}`);
              }}
              aria-hidden
              key={child.id}
              className="group relative flex aspect-square w-full cursor-pointer items-end justify-center overflow-hidden rounded-box border border-base-content/10 bg-base-200/30 p-2"
            >
              <div className="relative z-10 w-full overflow-hidden rounded-box bg-base-100/70 py-2 text-center backdrop-blur-sm">
                <p className="line-clamp-2 text-base font-medium">
                  {child.name}
                </p>
                <p className="mt-1 text-xs text-base-content/70">
                  {child.children.length
                    ? `子文件夹数：${child.children.length}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-base-content/70">
                  {child.count ? `总文件数：${child.count}` : ""}
                </p>
              </div>

              {props.children}
            </div>
          );
        };

        if (!child.coverId || !config) {
          return (
            <Card key={child.id}>
              <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center bg-neutral pb-14 transition-all ease-in-out">
                <LightBulbIcon className="h-24 w-24 text-neutral-content" />
              </div>
            </Card>
          );
        } else {
          const image = cover_images?.find((img) => img.id === child.coverId);
          if (!image) return null;

          const pathParts = image?.path.split(/\/|\\/);
          const libraryName = pathParts[pathParts.length - 4]?.replace(
            ".library",
            "",
          );
          const imageId = pathParts[pathParts.length - 2];

          const host = `http://${config.ip}:${config.clientPort}`;
          const src = `${host}/static/${libraryName}/images/${imageId}/${image.name}.${image.ext}`;
          const thumbnailPath = image.noThumbnail
            ? src
            : `${host}/static/${libraryName}/images/${imageId}/${image.name}_thumbnail.png`;

          return (
            <Card key={child.id}>
              <Image
                src={thumbnailPath ?? ""}
                className="absolute left-0 top-0 h-full w-full bg-base-200 object-contain object-center transition-all ease-in-out"
                layout="fill"
              />
            </Card>
          );
        }
      })}
    </div>
  );
};

export default ChildFolderCardList;
