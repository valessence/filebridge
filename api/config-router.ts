import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";

export const configRouter = createRouter({
  public: publicQuery.query(() => ({
    appName: "FileBridge",
    iceServers: env.iceServers,
  })),
});