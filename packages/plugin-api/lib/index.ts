import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import image from "./image";
import { createSymlink } from "./script";
import { join } from "path";
import cors from "@fastify/cors";

const PLUGIN_API = async (library: string) => {
  BigInt.prototype["toJSON"] = function () {
    return Number(this);
  };

  await createSymlink(library);

  const fastify = Fastify({
    logger: true,
  });

  // 静态资源管理
  await fastify.register(fastifyStatic, {
    root: join(__dirname, "../public/library"),
    prefix: "/public/",
  });

  await fastify.register(cors, {});

  // api
  fastify.register(image, { prefix: "/api" });

  fastify.listen({ port: +process.env.PORT || 3000 }, function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }

    fastify.log.info(`Server is now listening on ${address}`);
  });
};

export default PLUGIN_API;
