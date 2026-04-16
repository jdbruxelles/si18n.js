import { build } from "esbuild";
import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const rootDir = path.resolve(currentDir, "..");

const packageJson = JSON.parse(
  await readFile(path.join(rootDir, "package.json"), "utf8")
);

const banner = `/*!\n * @license si18n.js - v${packageJson.version}\n * Copyright (c) Jose dBruxelles <jd.bruxelles.dev/c>.\n * MIT License\n */`;

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

const buildLegacyEs6File = async (minify, outputFile) => {
  await build({
    absWorkingDir: rootDir,
    entryPoints: ["src/browser/global.ts"],
    outfile: outputFile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2015"],
    globalName: "Si18nBundle",
    minify,
    banner: {
      js: banner
    },
    logLevel: "info"
  });
};

await buildModernBrowserFile(false, "si18n.js");
await buildModernBrowserFile(true, "si18n.min.js");
await buildLegacyEs6File(false, "si18n.es6.js");
await buildLegacyEs6File(true, "si18n.es6.min.js");

await copyFile(
  path.join(rootDir, "si18n.js"),
  path.join(rootDir, "website", "si18n.js")
);
await copyFile(
  path.join(rootDir, "si18n.min.js"),
  path.join(rootDir, "website", "si18n.min.js")
);
await copyFile(
  path.join(rootDir, "si18n.es6.js"),
  path.join(rootDir, "website", "si18n.es6.js")
);
await copyFile(
  path.join(rootDir, "si18n.es6.min.js"),
  path.join(rootDir, "website", "si18n.es6.min.js")
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
