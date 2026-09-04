const test = require("node:test");
const assert = require("node:assert/strict");

const { Si18nBrowser } = require("../dist/browser/index.cjs");

// ─── MOCK DOM SETUP

function createMockDOM() {
  const elements = [];
  const root = {
    lang: "",
    dir: ""
  };
  const storage = new Map();

  class MockElement {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase();
      this.attributes = { ...attrs };
      this.dataset = {};
      this.textContent = attrs.textContent || "";
      this.innerHTML = attrs.innerHTML || "";
      this.listeners = {};
      this.id = attrs.id || "";
      this.value = attrs.value || "";
      this.options = [];
      this.disabled = Boolean(attrs.disabled);
      this._classes = new Set();

      if (attrs.class) {
        attrs.class
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => this._classes.add(c));
      }

      for (const [k, v] of Object.entries(attrs)) {
        if (k.startsWith("data-")) {
          const camel = k
            .slice(5)
            .replace(/-([a-z])/g, (_, l) => l.toUpperCase());
          this.dataset[camel] = String(v);
        }
      }

      this.classList = {
        add: (cls) => this._classes.add(cls),
        remove: (cls) => this._classes.delete(cls),
        contains: (cls) => this._classes.has(cls),
        toggle: (cls) => {
          if (this._classes.has(cls)) {
            this._classes.delete(cls);
            return false;
          }
          this._classes.add(cls);
          return true;
        }
      };

      elements.push(this);
    }

    setAttribute(name, val) {
      this.attributes[name] = String(val);
    }

    getAttribute(name) {
      return this.attributes[name] !== undefined ? this.attributes[name] : null;
    }

    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    }

    dispatchEvent(event) {
      const evt = typeof event === "string" ? { type: event } : event;
      (this.listeners[evt.type] || []).forEach((fn) => fn(evt));
    }

    click() {
      this.dispatchEvent({ type: "click" });
    }
  }

  function matches(el, selector) {
    if (selector === "[data-si18n]") {
      return el.dataset.si18n !== undefined;
    }
    if (selector.startsWith(".")) {
      return el.classList.contains(selector.slice(1));
    }
    if (selector.startsWith("#")) {
      return el.id === selector.slice(1);
    }
    if (selector.startsWith("[") && selector.endsWith("]")) {
      const attr = selector.slice(1, -1);
      return (
        el.getAttribute(attr) !== null ||
        el.dataset[
          attr
            .replace(/^data-/, "")
            .replace(/-([a-z])/g, (_, l) => l.toUpperCase())
        ] !== undefined
      );
    }
    return el.tagName.toLowerCase() === selector.toLowerCase();
  }

  const document = {
    documentElement: root,
    createElement(tag, attrs) {
      return new MockElement(tag, attrs);
    },
    querySelectorAll(selector) {
      return elements.filter((el) => matches(el, selector));
    },
    querySelector(selector) {
      return elements.find((el) => matches(el, selector)) || null;
    }
  };

  const window = {
    location: {
      search: "",
      reload: () => {}
    }
  };

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };

  const navigator = {
    language: "en-US"
  };

  return {
    root,
    storage,
    MockElement,
    elements,
    document,
    window,
    localStorage,
    navigator
  };
}

let originalDocument;
let originalWindow;
let originalLocalStorage;
let originalFetch;

function setupMockEnvironment(mock) {
  originalDocument = global.document;
  originalWindow = global.window;
  originalLocalStorage = global.localStorage;
  originalFetch = global.fetch;

  global.document = mock.document;
  global.window = mock.window;
  global.localStorage = mock.localStorage;
}

function restoreEnvironment() {
  global.document = originalDocument;
  global.window = originalWindow;
  global.localStorage = originalLocalStorage;
  global.fetch = originalFetch;
}

// ─── TESTS

test("Si18nBrowser sets documentElement lang and dir for LTR and RTL locales", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { title: "Hello" },
      ar: { title: "مرحبا", rtl: true }
    },
    lang: "en",
    fallbackLang: "en"
  });

  assert.equal(dom.root.lang, "en");
  assert.equal(dom.root.dir, "ltr");

  await i18n.setLocale("ar");
  assert.equal(dom.root.lang, "ar");
  assert.equal(dom.root.dir, "rtl");
});

test("Si18nBrowser translates elements with data-si18n textContent", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const titleEl = new dom.MockElement("h1", { "data-si18n": "heading" });
  const descEl = new dom.MockElement("p", { "data-si18n": "description" });

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { heading: "Welcome", description: "Hello world" },
      fr: { heading: "Bienvenue", description: "Bonjour le monde" }
    },
    lang: "en"
  });

  assert.equal(titleEl.textContent, "Welcome");
  assert.equal(descEl.textContent, "Hello world");

  await i18n.setLocale("fr");
  assert.equal(titleEl.textContent, "Bienvenue");
  assert.equal(descEl.textContent, "Bonjour le monde");
});

test("Si18nBrowser sets innerHTML when data-si18n-html is true", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const htmlEl = new dom.MockElement("div", {
    "data-si18n": "markup",
    "data-si18n-html": "true"
  });

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { markup: "<strong>Hello</strong>" },
      fr: { markup: "<em>Bonjour</em>" }
    },
    lang: "en"
  });

  assert.equal(htmlEl.innerHTML, "<strong>Hello</strong>");
  assert.equal(htmlEl.textContent, "");

  await i18n.setLocale("fr");
  assert.equal(htmlEl.innerHTML, "<em>Bonjour</em>");
});

test("Si18nBrowser skips text replacement when data-si18n-default is false", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const el = new dom.MockElement("span", {
    "data-si18n": "title",
    "data-si18n-default": "false",
    "data-si18n-title": "",
    textContent: "Keep this text"
  });

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { title: "Title in EN" }
    },
    lang: "en"
  });

  assert.equal(el.textContent, "Keep this text");
  assert.equal(el.getAttribute("title"), "Title in EN");
});

test("Si18nBrowser translates supported auto-translation attributes", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const inputEl = new dom.MockElement("input", {
    "data-si18n": "field",
    "data-si18n-placeholder": "",
    "data-si18n-value": "",
    "data-si18n-title": "",
    "data-si18n-aria-label": ""
  });

  const imgEl = new dom.MockElement("img", {
    "data-si18n": "banner",
    "data-si18n-alt": ""
  });

  const metaEl = new dom.MockElement("meta", {
    "data-si18n": "metaDesc",
    "data-si18n-content": ""
  });

  const labelEl = new dom.MockElement("label", {
    "data-si18n": "labelText",
    "data-si18n-label": ""
  });

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: {
        field: "Search here",
        banner: "Banner image",
        metaDesc: "Page description",
        labelText: "Field label"
      },
      es: {
        field: "Buscar aqui",
        banner: "Imagen de banner",
        metaDesc: "Descripcion de pagina",
        labelText: "Etiqueta de campo"
      }
    },
    lang: "en"
  });

  assert.equal(inputEl.getAttribute("placeholder"), "Search here");
  assert.equal(inputEl.getAttribute("value"), "Search here");
  assert.equal(inputEl.getAttribute("title"), "Search here");
  assert.equal(inputEl.getAttribute("aria-label"), "Search here");
  assert.equal(imgEl.getAttribute("alt"), "Banner image");
  assert.equal(metaEl.getAttribute("content"), "Page description");
  assert.equal(labelEl.getAttribute("label"), "Field label");

  await i18n.setLocale("es");
  assert.equal(inputEl.getAttribute("placeholder"), "Buscar aqui");
  assert.equal(inputEl.getAttribute("value"), "Buscar aqui");
  assert.equal(imgEl.getAttribute("alt"), "Imagen de banner");
});

test("Si18nBrowser manages toggler buttons and activeClass", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const btnEn = new dom.MockElement("button", {
    class: "lang-btn",
    "data-lang": "en"
  });
  const btnFr = new dom.MockElement("button", {
    class: "lang-btn",
    "data-lang": "fr"
  });

  let subscriberCalledWith = null;
  const i18n = new Si18nBrowser();
  i18n.subscribe((info) => {
    subscriberCalledWith = info;
  });

  await i18n.init({
    locales: {
      en: { msg: "Hello" },
      fr: { msg: "Bonjour" }
    },
    lang: "en",
    togglersSelector: ".lang-btn",
    activeClass: "is-active"
  });

  assert.equal(btnEn.classList.contains("is-active"), true);
  assert.equal(btnFr.classList.contains("is-active"), false);

  // Click French button
  btnFr.click();
  // Wait for setLocale promise
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(i18n.getLocale(), "fr");
  assert.equal(btnEn.classList.contains("is-active"), false);
  assert.equal(btnFr.classList.contains("is-active"), true);
  assert.equal(subscriberCalledWith, "fr");
});

test("Si18nBrowser manages select toggler and disables unavailable options", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const select = new dom.MockElement("select", {
    id: "locale-select"
  });
  const optEn = { value: "en", disabled: false };
  const optDe = { value: "de", disabled: false };
  const optJa = { value: "ja", disabled: false }; // unavailable
  select.options = [optEn, optDe, optJa];

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { msg: "Hello" },
      de: { msg: "Hallo" }
    },
    lang: "en",
    togglersSelector: "#locale-select",
    isTogglerSelect: true
  });

  assert.equal(select.value, "en");
  assert.equal(optEn.disabled, false);
  assert.equal(optDe.disabled, false);
  assert.equal(optJa.disabled, true);

  // Trigger change to "de"
  select.value = "de";
  select.dispatchEvent({ type: "change" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(i18n.getLocale(), "de");
  assert.equal(select.value, "de");

  // Attempting to select unavailable locale should be ignored
  select.value = "ja";
  select.dispatchEvent({ type: "change" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(i18n.getLocale(), "de");
});

test("Si18nBrowser throws when togglersSelector matches no elements", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const i18n = new Si18nBrowser();
  await assert.rejects(
    async () => {
      await i18n.init({
        locales: { en: {} },
        lang: "en",
        togglersSelector: ".non-existent-button"
      });
    },
    {
      name: "Error",
      message: /The togglersSelector option must be a valid selector and match at least one element/
    }
  );
});

test("Si18nBrowser throws when isTogglerSelect matches no elements", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const i18n = new Si18nBrowser();
  await assert.rejects(
    async () => {
      await i18n.init({
        locales: { en: {} },
        lang: "en",
        togglersSelector: "#missing-select",
        isTogglerSelect: true
      });
    },
    {
      name: "Error",
      message: /The togglersSelector option must be a valid selector and match at least one element/
    }
  );
});

test("Si18nBrowser automatically initializes when options are passed to constructor", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const el = new dom.MockElement("span", { "data-si18n": "greet" });

  const i18n = new Si18nBrowser({
    locales: { en: { greet: "Hi from constructor" } },
    lang: "en"
  });

  // Wait tick for void this.init(options) in constructor
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(i18n.isInitialized(), true);
  assert.equal(el.textContent, "Hi from constructor");
});

test("Si18nBrowser.getJSON fetches and parses JSON payload", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const mockPayload = { en: { welcome: "Welcome" } };
  global.fetch = async (url) => {
    assert.equal(url, "/locales/en.json");
    return {
      json: async () => mockPayload
    };
  };

  const data = await Si18nBrowser.getJSON("/locales/en.json");
  assert.deepEqual(data, mockPayload);

  let callbackReceived = null;
  await Si18nBrowser.getJSON("/locales/en.json", (val) => {
    callbackReceived = val;
  });
  assert.deepEqual(callbackReceived, mockPayload);
});

test("Si18nBrowser loads locales via fetch with path option", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const responses = {
    "/locales/en.json": { ok: true, json: async () => ({ welcome: "Welcome" }) },
    "/locales/fr.json": { ok: true, json: async () => ({ welcome: "Bienvenue" }) }
  };

  global.fetch = async (url) => {
    const res = responses[url];
    if (!res) return { ok: false };
    return res;
  };

  const textEl = new dom.MockElement("p", { "data-si18n": "welcome" });

  const i18n = new Si18nBrowser();
  await i18n.init({
    path: "/locales",
    availableLocales: ["en", "fr"],
    lang: "en"
  });

  assert.equal(textEl.textContent, "Welcome");

  await i18n.setLocale("fr");
  assert.equal(textEl.textContent, "Bienvenue");
});

test("Si18nBrowser throws clear error when path locale loader fetch fails", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  global.fetch = async () => ({
    ok: false
  });

  const originalError = console.error;
  console.error = () => {};
  try {
    const i18n = new Si18nBrowser();
    await assert.rejects(
      async () => {
        await i18n.init({
          path: "/missing-locales",
          availableLocales: ["en"],
          lang: "en"
        });
      },
      {
        name: "Error",
        message: /Locale file for "en" could not be loaded from "\/missing-locales"/
      }
    );
  } finally {
    console.error = originalError;
  }
});

test("Si18nBrowser reads locale from URL search params", async (t) => {
  const dom = createMockDOM();
  dom.window.location.search = "?lang=fr";
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { msg: "Hello" },
      fr: { msg: "Bonjour" }
    },
    saveAs: "lang",
    fallbackLang: "en"
  });

  assert.equal(i18n.getLocale(), "fr");
});

test("Si18nBrowser saves and reads locale from localStorage", async (t) => {
  const dom = createMockDOM();
  setupMockEnvironment(dom);
  t.after(restoreEnvironment);

  const i18n = new Si18nBrowser();
  await i18n.init({
    locales: {
      en: { msg: "Hello" },
      es: { msg: "Hola" }
    },
    lang: "en",
    saveAs: "site_locale",
    saveLang: true
  });

  await i18n.setLocale("es");
  assert.equal(dom.storage.get("site_locale"), "es");

  const secondI18n = new Si18nBrowser();
  await secondI18n.init({
    locales: {
      en: { msg: "Hello" },
      es: { msg: "Hola" }
    },
    saveAs: "site_locale",
    fallbackLang: "en"
  });
  assert.equal(secondI18n.getLocale(), "es");
});

test("Si18nBrowser handles environments where document is undefined gracefully", async () => {
  const originalDoc = global.document;
  try {
    delete global.document;
    const i18n = new Si18nBrowser();
    await i18n.init({
      locales: { en: { hi: "Hi" } },
      lang: "en"
    });
    assert.equal(i18n.t("hi"), "Hi");
  } finally {
    global.document = originalDoc;
  }
});
