const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Root entrypoint exports all expected classes and constants", () => {
  const root = require("../dist/index.cjs");

  assert.ok(root.Si18n, "root.Si18n should exist");
  assert.ok(root.Si18nBrowser, "root.Si18nBrowser should exist");
  assert.equal(root.Si18n, root.Si18nBrowser, "Si18n and Si18nBrowser should be identical");
  assert.equal(root.default, root.Si18nBrowser, "default export should be Si18nBrowser");
  assert.ok(root.Si18nCore, "root.Si18nCore should exist");
  assert.ok(root.DOCS_LINK, "root.DOCS_LINK should exist");
});

test("Core entrypoint exports expected items", () => {
  const core = require("../dist/core/index.cjs");

  assert.ok(core.Si18nCore, "core.Si18nCore should exist");
  assert.equal(core.default, core.Si18nCore, "core default should be Si18nCore");
  assert.ok(core.DOCS_LINK, "core.DOCS_LINK should exist");
});

test("Browser entrypoint exports expected items and aliases", () => {
  const browser = require("../dist/browser/index.cjs");

  assert.ok(browser.Si18nBrowser, "browser.Si18nBrowser should exist");
  assert.ok(browser.Si18n, "browser.Si18n alias should exist");
  assert.equal(browser.Si18n, browser.Si18nBrowser);
  assert.equal(browser.default, browser.Si18nBrowser);
});

test("Node entrypoint exports expected items and aliases", () => {
  const node = require("../dist/node/index.cjs");

  assert.ok(node.Si18nNode, "node.Si18nNode should exist");
  assert.ok(node.Si18n, "node.Si18n alias should exist");
  assert.equal(node.Si18n, node.Si18nNode);
  assert.equal(node.default, node.Si18nNode);
  assert.equal(typeof node.createMemoryStorage, "function");
  assert.equal(typeof node.createProcessEnvStorage, "function");
});

test("React entrypoints export expected components and hooks", () => {
  const react = require("../dist/react/index.cjs");
  const reactServer = require("../dist/react/server.cjs");

  assert.ok(react.Si18nProvider, "react.Si18nProvider should exist");
  assert.equal(react.default, react.Si18nProvider);
  assert.equal(typeof react.useTranslation, "function");

  assert.equal(typeof reactServer.createServerTranslator, "function");
  assert.equal(reactServer.default, reactServer.createServerTranslator);
});

// Verifies full dual-package hazard prevention and parity between ESM and CJS builds.
test("ESM entrypoints match CJS exports across all 6 subpaths", async () => {
  const entrypoints = [
    { name: "root", cjs: "../dist/index.cjs", esm: "../dist/index.mjs" },
    { name: "core", cjs: "../dist/core/index.cjs", esm: "../dist/core/index.mjs" },
    { name: "browser", cjs: "../dist/browser/index.cjs", esm: "../dist/browser/index.mjs" },
    { name: "node", cjs: "../dist/node/index.cjs", esm: "../dist/node/index.mjs" },
    { name: "react", cjs: "../dist/react/index.cjs", esm: "../dist/react/index.mjs" },
    { name: "react/server", cjs: "../dist/react/server.cjs", esm: "../dist/react/server.mjs" },
  ];

  for (const entry of entrypoints) {
    const cjsModule = require(entry.cjs);
    const esmModule = await import(entry.esm);

    const cjsKeys = Object.keys(cjsModule).sort();
    const esmKeys = Object.keys(esmModule).sort();

    assert.deepEqual(
      esmKeys,
      cjsKeys,
      `Export keys mismatch for ${entry.name}: ESM [${esmKeys}] vs CJS [${cjsKeys}]`
    );

    // Verify types match across exports
    for (const key of cjsKeys) {
      assert.equal(
        typeof esmModule[key],
        typeof cjsModule[key],
        `Type mismatch for export '${key}' in ${entry.name}`
      );

      // Verify primitive value parity (e.g. string constants like DOCS_LINK)
      if (typeof cjsModule[key] !== "function" && typeof cjsModule[key] !== "object") {
        assert.equal(
          esmModule[key],
          cjsModule[key],
          `Value mismatch for constant '${key}' in ${entry.name}`
        );
      }
    }
  }

  // Verify internal alias and default export consistency in ESM
  const esmRoot = await import("../dist/index.mjs");
  assert.equal(esmRoot.Si18n, esmRoot.Si18nBrowser, "ESM Root Si18n should equal Si18nBrowser");
  assert.equal(esmRoot.default, esmRoot.Si18nBrowser, "ESM Root default should equal Si18nBrowser");

  const esmCore = await import("../dist/core/index.mjs");
  assert.equal(esmCore.default, esmCore.Si18nCore, "ESM Core default should equal Si18nCore");

  const esmBrowser = await import("../dist/browser/index.mjs");
  assert.equal(esmBrowser.Si18n, esmBrowser.Si18nBrowser, "ESM Browser Si18n should equal Si18nBrowser");
  assert.equal(esmBrowser.default, esmBrowser.Si18nBrowser, "ESM Browser default should equal Si18nBrowser");

  const esmNode = await import("../dist/node/index.mjs");
  assert.equal(esmNode.Si18n, esmNode.Si18nNode, "ESM Node Si18n should equal Si18nNode");
  assert.equal(esmNode.default, esmNode.Si18nNode, "ESM Node default should equal Si18nNode");

  const esmReact = await import("../dist/react/index.mjs");
  assert.equal(esmReact.default, esmReact.Si18nProvider, "ESM React default should equal Si18nProvider");

  const esmReactServer = await import("../dist/react/server.mjs");
  assert.equal(
    esmReactServer.default,
    esmReactServer.createServerTranslator,
    "ESM React server default should equal createServerTranslator"
  );
});

// Verifies packaging integrity: ensures every file referenced in package.json exists on disk.
test("package.json targets (main, module, types, files, exports) exist on disk", () => {
  const pkg = require("../package.json");
  const rootDir = path.resolve(__dirname, "..");

  // Verify main, module, types
  const coreTargets = [
    { field: "main", target: pkg.main },
    { field: "module", target: pkg.module },
    { field: "types", target: pkg.types },
  ];

  for (const { field, target } of coreTargets) {
    assert.ok(target, `package.json should define '${field}'`);
    const resolved = path.resolve(rootDir, target);
    assert.ok(fs.existsSync(resolved), `Target '${field}' (${target}) must exist on disk`);
  }

  // Verify files array
  assert.ok(Array.isArray(pkg.files) && pkg.files.length > 0, "package.json files array must not be empty");
  for (const fileEntry of pkg.files) {
    const resolved = path.resolve(rootDir, fileEntry);
    assert.ok(fs.existsSync(resolved), `File/directory in files array (${fileEntry}) must exist on disk`);
  }

  // Helper to collect leaf string paths from exports object
  function collectLeafStrings(obj) {
    const results = [];
    for (const val of Object.values(obj)) {
      if (typeof val === "string") {
        results.push(val);
      } else if (val && typeof val === "object") {
        results.push(...collectLeafStrings(val));
      }
    }
    return results;
  }

  // Verify all string targets in exports exist
  assert.ok(pkg.exports && typeof pkg.exports === "object", "package.json exports must be an object");
  const exportTargets = collectLeafStrings(pkg.exports);
  assert.ok(exportTargets.length > 0, "package.json exports must define export paths");

  for (const exportTarget of exportTargets) {
    const resolved = path.resolve(rootDir, exportTarget);
    assert.ok(fs.existsSync(resolved), `Export target (${exportTarget}) must exist on disk`);
  }
});
