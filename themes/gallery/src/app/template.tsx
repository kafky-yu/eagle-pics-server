"use client";

import { useEffect } from "react";

import Setting from "~/components/Setting";
import { trpc } from "~/utils/trpc";

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
