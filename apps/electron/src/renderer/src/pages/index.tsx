import Content from "@renderer/components/Content";
import Title from "@renderer/components/Title";

import { PRODUCT_NAME } from "@rao-pics/constant";

const Index = () => {
  return (
    <Content title={<Title />}>
      <div className="flex h-full select-none flex-col items-center justify-center px-4 pb-12">
        <p className="font-serif text-7xl font-bold">
          {PRODUCT_NAME.replace(" ", ".")}
        </p>
        <p
          className="mt-2 text-center text-base text-base-content/80"
          dangerouslySetInnerHTML={{
            __html: `帮助你远程访问 Eagle 的素材资源，<br/><span class="font-medium text-primary">30+</span>外观随意切换，还可以自定义主题。`,
          }}
        />
        <button className="btn btn-primary mt-12 w-2/5">添加资源库</button>
      </div>
    </Content>
  );
};

export default Index;
