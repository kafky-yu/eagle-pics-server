import { color } from "./src/color";
import { config, configCore } from "./src/config";
import { eagle } from "./src/eagle_api/router";
import { eagleService } from "./src/eagle_api/service";
import { log, logCore } from "./src/log";
import { pending, pendingCore } from "./src/pending";
import { tag } from "./src/tag";
import { t } from "./src/utils";

export const router = t.router({
  config,
  pending,
  tag,
  color,
  log,
  eagle,
});

export const routerCore = {
  config: configCore,
  pending: pendingCore,
  log: logCore,
  eagle: eagleService,
};

export type AppRouter = typeof router;
export { t } from "./src/utils";
export * from "./src/server";
