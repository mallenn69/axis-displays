// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const baseConfig = defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

// Source inspection adds DOM attributes that R3F interprets as nested Three.js
// properties. Exclude only the two scene modules; keep inspection on the site UI.
import type { ConfigEnv, PluginOption } from "vite";
async function protectSceneModules(options: PluginOption[]): Promise<PluginOption[]> {
  return Promise.all(
    options.map(async (option) => {
      const plugin = await option;
      if (Array.isArray(plugin)) return protectSceneModules(plugin);
      if (
        !plugin ||
        plugin.name !== "@tanstack/devtools:inject-source" ||
        !("transform" in plugin) ||
        typeof plugin.transform !== "object"
      )
        return plugin;
      return {
        ...plugin,
        transform: {
          ...plugin.transform,
          filter: {
            id: {
              exclude: [
                /node_modules/,
                /\?raw/,
                /\/dist\//,
                /\/build\//,
                /\/components\/axis\/scene\//,
                /\/components\/builder\/builder-scene\.tsx/,
              ],
            },
          },
        },
      };
    }),
  );
}
export default async (env: ConfigEnv) => {
  const config = await baseConfig(env);
  config.plugins = await protectSceneModules(config.plugins ?? []);
  return config;
};
