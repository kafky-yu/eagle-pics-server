/**
 * 静态服务器包含
 * - 主题
 * - library 资源
 */

import path from "path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";

import { RLogger } from "@rao-pics/rlog";

import { routerCore } from "../..";

let server: ReturnType<typeof fastify> | undefined;

export const startClientServer = async () => {
  server = fastify({
    maxParamLength: 5000,
  });

  void server.register(cors, {
    origin: "*",
  });

  let config = await routerCore.config.findUnique();
  if (!config) return;

  server.get("/common/config", async (_req, reply) => {
    config = await routerCore.config.findUnique();

    return reply.send(config);
  });

  await server.register(fastifyStatic, {
    root: path.join(
      process.resourcesPath,
      "extraResources",
      "themes",
      config.theme,
    ),
    redirect: true,
  });

  const libraries = await routerCore.library.findMany();
  console.log(libraries);

  if (!libraries.length) return;

  // 注册每个储存库的静态文件路由
  for (const lib of libraries) {
    const lib_name = lib?.path?.split(/\/|\\/).pop()?.replace(".library", "");
    if (!lib_name) continue;

    await server.register(fastifyStatic, {
      root: path.join(lib.path),
      prefix: `/static/${lib_name}/`,
      decorateReply: false,
    });
  }

  server.setNotFoundHandler((_req, reply) => {
    return reply.sendFile("404.html");
  });

  await server.listen({ port: config.clientPort, host: "0.0.0.0" });

  RLogger.info(
    `client server listening on http://${config.ip}:${config.clientPort}`,
    "startClientServer",
  );
};

export const closeClientServer = async () => {
  await server?.close();
  server = undefined;
};

export const restartClientServer = async () => {
  await closeClientServer();
  await startClientServer();
};
