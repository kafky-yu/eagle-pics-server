"use client";

import { useEffect } from "react";

import { trpc } from "@rao-pics/trpc";

import Setting from "./_components/Setting";

export default function Template({ children }: { children: React.ReactNode }) {
  // const { data: lib } = trpc.library.findUnique.useQuery();
  const { data: config } = trpc.config.findUnique.useQuery();

  useEffect(() => {
    if (config) {
      document.querySelector("html")?.setAttribute("data-theme", config.color);
    }
  }, [config]);

  return (
    <>
      {children}
      <Setting />
    </>
  );
}
