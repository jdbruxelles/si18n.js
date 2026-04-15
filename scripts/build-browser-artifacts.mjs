import { transformAsync } from "@babel/core";
import { build } from "esbuild";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const rootDir = path.resolve(currentDir, "..");

const packageJson = JSON.parse(
  await readFile(path.join(rootDir, "package.json"), "utf8")
);

const banner = `/*!\n * @license si18n.js - v${packageJson.version}\n * Copyright (c) Jose dBruxelles <jd.bruxelles.dev/c>.\n * MIT License\n */`;

const transformToEs5 = async (sourceCode, minify) => {
  const transformed = await transformAsync(sourceCode, {
    presets: [
      ["@babel/preset-env", { targets: { ie: "11" }, modules: false }],
      ...(minify
        ? [["minify", { mangle: { keepClassName: true } }]]
        : [])
    ],
    comments: false,
    compact: minify,
    minified: minify,
    shouldPrintComment: (value) => /@license/.test(value),
    babelrc: false,
    configFile: false
  });

  return transformed?.code ?? sourceCode;
};

const buildModernBrowserFile = async (minify, outputFile) => {
  await build({
    absWorkingDir: rootDir,
    entryPoints: ["src/browser/index.ts"],
    outfile: outputFile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    minify,
    banner: {
      js: banner
    },
    logLevel: "info"
  });
};

const buildLegacyEs5File = async (minify, outputFile) => {
  const bundled = await build({
    absWorkingDir: rootDir,
    entryPoints: ["src/browser/global.ts"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    globalName: "Si18nBundle",
    minify: false,
    write: false,
    banner: {
      js: banner
    },
    logLevel: "silent"
  });

  const output = bundled.outputFiles?.[0]?.text;
  if (!output) {
    throw new Error("Failed to produce legacy browser bundle.");
  }

  const es5Output = await transformToEs5(output, minify);
  await writeFile(path.join(rootDir, outputFile), es5Output, "utf8");
};

await buildModernBrowserFile(false, "si18n.js");
await buildModernBrowserFile(true, "si18n.min.js");
await buildLegacyEs5File(false, "si18n.es5.js");
await buildLegacyEs5File(true, "si18n.es5.min.js");

await copyFile(
  path.join(rootDir, "si18n.js"),
  path.join(rootDir, "website", "si18n.js")
);
await copyFile(
  path.join(rootDir, "si18n.min.js"),
  path.join(rootDir, "website", "si18n.min.js")
);
await copyFile(
  path.join(rootDir, "si18n.es5.js"),
  path.join(rootDir, "website", "si18n.es5.js")
);
await copyFile(
  path.join(rootDir, "si18n.es5.min.js"),
  path.join(rootDir, "website", "si18n.es5.min.js")
);

await build({
  absWorkingDir: rootDir,
  entryPoints: ["website/demo.js"],
  outfile: "website/demo.min.js",
  bundle: false,
  format: "esm",
  target: ["es2017"],
  minify: true,
  legalComments: "none",
  logLevel: "info"
});
