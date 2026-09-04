const test = require("node:test");
const assert = require("node:assert/strict");

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
