import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "browser/index": "src/browser/index.ts",
    "node/index": "src/node/index.ts",
    "react/index": "src/react/client.tsx",
    "react/server": "src/react/server.ts"
  },
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  outDir: "dist",
  sourcemap: true,
  target: "es2020",
  minify: false,
  cjsDefault: true,
  outputOptions: (options, format) => {
    if (format === "cjs") {
      return {
        ...options,
        exports: "named"
      };
    }
    return options;
  },
  deps: {
    neverBundle: ["react"]
  }
});
