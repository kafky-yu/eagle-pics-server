import { useState } from "react";

import { trpc } from "@rao-pics/trpc";

import { useColor } from "../hooks";
import Index from "../pages/index";
import LayoutAside from "./aside";
import LayoutContent from "./content";

const Layout = () => {
  const [current, setCurrent] = useState(0);
  const { color } = useColor();

  const { data: library } = trpc.eagle.getLibraryInfo.useQuery();
  const libraryName = library?.library.name ?? "暂无资源库";

  return (
    <div
      data-theme={color}
      className="flex h-screen w-screen overflow-hidden rounded-box bg-base-100 text-sm"
    >
      {/* aside */}
      <LayoutAside
        current={current}
        setCurrent={setCurrent}
        libraryName={libraryName}
      />

      {/* content */}
      {library ? <LayoutContent current={current} /> : <Index />}
    </div>
  );
};

export default Layout;
