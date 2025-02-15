import { color } from "./src/color";
import { config, configCore } from "./src/config";
import { eagle } from "./src/eagle_api/router";
import { eagleService } from "./src/eagle_api/service";
import { folder, folderCore } from "./src/folder";
import { image, imageCore } from "./src/image";
import { library, libraryCore } from "./src/library";
import { log, logCore } from "./src/log";
import { pending, pendingCore } from "./src/pending";
import { sync } from "./src/sync";
import { tag } from "./src/tag";
import { t } from "./src/utils";

export const router = t.router({
  config,
  library,
  pending,
  folder,
  sync,
  image,
  tag,
  color,
  log,
  eagle,
});

export const routerCore = {
  config: configCore,
  folder: folderCore,
  image: imageCore,
  library: libraryCore,
  pending: pendingCore,
  log: logCore,
  eagle: eagleService,
};

export type AppRouter = typeof router;
export { t } from "./src/utils";
export * from "./src/server";
