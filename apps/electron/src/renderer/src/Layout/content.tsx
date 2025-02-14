import BasicPage from "@renderer/pages/basic";
import ColorPage from "@renderer/pages/color";
import SettingPage from "@renderer/pages/setting";

function LayoutContent({ current }: { current: number }) {
  return (
    <>
      {current === 0 && <BasicPage />}
      {current === 1 && <SettingPage />}
      {current === 2 && <ColorPage />}
    </>
  );
}

export default LayoutContent;
