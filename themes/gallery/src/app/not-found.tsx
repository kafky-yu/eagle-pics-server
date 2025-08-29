"use client";

import Error from "~/components/ui/Error";

export default function NotFound() {
  return (
    <Error
      statusCode={404}
      statusMessage="Hey，我想你迷路了吧！"
      btnText="返回首页"
    />
  );
}
