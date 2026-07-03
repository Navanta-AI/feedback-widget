import { defineConfig } from "tsup";

// Build config forked from SitePing's widget. `@siteping/core` is vendored into
// src/_core and resolved via an esbuild alias + tsconfig paths, so the package
// is self-contained (no @siteping/* runtime deps). React stays external so the
// host app pins its own version.
const pureCalls = ["console.debug", "console.info"] as const;
const coreAlias = { "@siteping/core": "./src/_core/index.ts" };
const bundleCore = ["@medv/finder", "@siteping/core"];

export default defineConfig([
  // ESM: main widget + the localStorage store, code-split (Panel + locale
  // chunks load on demand).
  {
    entry: ["src/index.ts", "src/adapter-localstorage.ts"],
    format: ["esm"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    splitting: true,
    treeshake: "recommended",
    noExternal: bundleCore,
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.alias = coreAlias;
    },
  },
  // IIFE: single global script for <script src> consumers.
  {
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "NavantaFeedback",
    platform: "browser",
    target: "es2022",
    dts: false,
    sourcemap: true,
    clean: false,
    minify: true,
    splitting: false,
    treeshake: "recommended",
    noExternal: bundleCore,
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.alias = coreAlias;
    },
  },
  // ESM React entry (`@navanta/feedback-widget/react`) — React external.
  {
    entry: ["src/react.ts"],
    format: ["esm"],
    platform: "browser",
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: false,
    minify: true,
    splitting: true,
    treeshake: "recommended",
    noExternal: bundleCore,
    external: ["react"],
    esbuildOptions(o) {
      o.pure = [...pureCalls];
      o.alias = coreAlias;
    },
  },
]);
