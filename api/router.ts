import { authRouter } from "./auth-router";
import { configRouter } from "./config-router";
import { signalingRouter } from "./signaling-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  health: publicQuery.query(() => ({ status: "ok" as const })),
  config: configRouter,
  auth: authRouter,
  signaling: signalingRouter,

  // TODO: add feature routers here, e.g.
  // todo: createRouter({
  //   list: publicQuery.query(() => findTodos()),
  // }),
});

export type AppRouter = typeof appRouter;
