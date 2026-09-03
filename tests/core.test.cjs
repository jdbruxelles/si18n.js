const test = require("node:test");
const assert = require("node:assert/strict");

const { Si18nCore } = require("../dist/core/index.cjs");

// ─── HELPERS

/** Returns a Si18nCoreDependencies stub that suppresses logError console noise. */
const silentDeps = (extra = {}) => ({
  logError: () => undefined,
  ...extra
});

/** Minimal inline locale collection for bootstrapping. */
const EN_FR = {
  en: { name: "English", greeting: "Hello", count: "You have %{n} item(s)" },
  fr: { name: "Francais", greeting: "Bonjour" }
};

// ─── EXISTING TESTS

test("Si18nCore translates with fallback and replacements", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: {
      en: {
        greeting: "Hello %{name}",
        nested: {
          title: "Welcome"
        }
      },
      fr: {
        greeting: "Bonjour %{name}",
        nested: {}
      }
    },
    lang: "fr",
    fallbackLang: "en"
  });

  assert.equal(i18n.t("greeting", { name: "Ada" }), "Bonjour Ada");
  assert.equal(i18n.t("nested.title"), "Welcome");
});

test("Si18nCore uses url locale with highest detection priority", async () => {
  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: (saveAs) => {
      assert.equal(saveAs, "lang");
      return "de-DE";
    },
    storage: {
      getItem: () => "fr",
      setItem: () => undefined
    },
    detectLanguage: () => "fr"
  });

  await i18n.init({
    locales: {
      en: { name: "English" },
      fr: { name: "Francais" },
      de: { name: "Deutsch" }
    },
    lang: "fr",
    fallbackLang: "en"
  });

  assert.equal(i18n.getLocale(), "de");
  assert.equal(i18n.t("name"), "Deutsch");
});

test("Si18nCore loads locales lazily and emits locale updates", async () => {
  const loadedLocales = [];
  const persistedLocales = [];

  const i18n = new Si18nCore(undefined, {
    storage: {
      getItem: () => null,
      setItem: (key, value) => {
        persistedLocales.push([key, value]);
      }
    }
  });

  await i18n.init({
    localeLoader: async (locale) => {
      loadedLocales.push(locale);
      if (locale === "en") {
        return { greeting: "Hello" };
      }
      return { greeting: "Salut" };
    },
    availableLocales: ["en", "fr"],
    lang: "fr",
    fallbackLang: "en",
    saveAs: "preferredLocale"
  });

  const localeEvents = [];
  const unsubscribe = i18n.subscribe((locale) => {
    localeEvents.push(locale);
  });

  await i18n.setLocale("en");
  unsubscribe();

  assert.deepEqual(loadedLocales, ["en", "fr"]);
  assert.deepEqual(localeEvents, ["en"]);
  assert.deepEqual(persistedLocales, [["preferredLocale", "en"]]);
  assert.equal(i18n.t("greeting"), "Hello");
});

test("Si18nCore normalizes lang and fallbackLang to available locales", async () => {
  const loadedLocales = [];
  const i18n = new Si18nCore();

  await i18n.init({
    localeLoader: async (locale) => {
      loadedLocales.push(locale);
      if (locale === "en") {
        return { name: "English" };
      }
      return { name: "Francais" };
    },
    availableLocales: ["en", "fr"],
    lang: "fr-CA",
    fallbackLang: "en-US",
    saveLang: false
  });

  assert.equal(i18n.getLocale(), "fr");
  assert.equal(i18n.toJSON().fallbackLang, "en");
  assert.deepEqual(loadedLocales, ["en", "fr"]);
});

test("Si18nCore rejects fallbackLang values outside available locales", async () => {
  const i18n = new Si18nCore();

  await assert.rejects(
    () =>
      i18n.init({
        locales: {
          en: { title: "Hello" }
        },
        availableLocales: ["en"],
        lang: "en",
        fallbackLang: "de"
      }),
    /fallbackLang option must match one of the availableLocales/
  );
});

// ─── validateInitOptions — INVALID OPTION TYPES

test("Si18nCore rejects empty options object", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(() => i18n.init({}), /No options provided/);
});

test("Si18nCore rejects non-string lang", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ locales: { en: {} }, lang: 42, fallbackLang: "en" }),
    /lang option must be a string/
  );
});

test("Si18nCore rejects non-string fallbackLang", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ locales: { en: {} }, lang: "en", fallbackLang: 42 }),
    /fallbackLang option must be a string/
  );
});

test("Si18nCore rejects non-object locales", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ locales: "bad", lang: "en" }),
    /locales option must be an object/
  );
});

test("Si18nCore rejects non-array availableLocales", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () =>
      i18n.init({
        locales: { en: {} },
        availableLocales: "en",
        lang: "en"
      }),
    /availableLocales option must be an array/
  );
});

test("Si18nCore rejects non-string path", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ path: 123, lang: "en", availableLocales: ["en"] }),
    /path option must be a string/
  );
});

test("Si18nCore rejects empty saveAs string", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () =>
      i18n.init({
        locales: { en: {} },
        lang: "en",
        saveAs: "   "
      }),
    /saveAs option must be a non-empty string/
  );
});

test("Si18nCore rejects non-function translate option", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () =>
      i18n.init({
        locales: { en: {} },
        lang: "en",
        translate: "not-a-function"
      }),
    /translate option must be a function/
  );
});

test("Si18nCore rejects non-function onLocaleChanged option", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () =>
      i18n.init({
        locales: { en: {} },
        lang: "en",
        onLocaleChanged: "not-a-function"
      }),
    /onLocaleChanged option must be a function/
  );
});

test("Si18nCore rejects non-function localeLoader option", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () =>
      i18n.init({
        availableLocales: ["en"],
        lang: "en",
        localeLoader: "not-a-function"
      }),
    /localeLoader option must be a function/
  );
});

test("Si18nCore rejects when neither locales nor path/localeLoader is provided", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ lang: "en", fallbackLang: "en" }),
    /Missing required options/
  );
});

test("Si18nCore rejects path option without availableLocales", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ path: "/some/path", lang: "en", fallbackLang: "en" }),
    /availableLocales option is required when using the path option/
  );
});

test("Si18nCore rejects when locales object is empty (no available locales)", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.init({ locales: {}, lang: "en" }),
    /No available locales were found/
  );
});

// ─── init — IDEMPOTENCY

test("Si18nCore second init() call is silently ignored", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { name: "English" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  // A second call with completely different options should be a no-op.
  await assert.doesNotReject(() =>
    i18n.init({
      locales: { fr: { name: "Francais" } },
      lang: "fr",
      fallbackLang: "fr",
      saveLang: false
    })
  );

  assert.equal(i18n.getLocale(), "en");
});

// ─── isInitialized

test("Si18nCore isInitialized() returns false before init and true after", async () => {
  const i18n = new Si18nCore();
  assert.equal(i18n.isInitialized(), false);

  await i18n.init({
    locales: { en: { name: "English" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.isInitialized(), true);
});

// ─── t() — edge cases

test("Si18nCore t() returns path string when key is missing in both lang and fallback", async () => {
  const errors = [];
  const i18n = new Si18nCore(undefined, {
    logError: (msg) => errors.push(msg)
  });

  await i18n.init({
    locales: { en: { name: "English" }, fr: {} },
    lang: "fr",
    fallbackLang: "en",
    saveLang: false
  });

  const result = i18n.t("totally.missing.path");
  assert.equal(result, "totally.missing.path");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /totally\.missing\.path/);
});

test("Si18nCore t() returns object when path resolves to a non-string value", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { nested: { title: "Hello", sub: { deep: true } } } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  const result = i18n.t("nested");
  assert.deepEqual(result, { title: "Hello", sub: { deep: true } });
});

test("Si18nCore t() supports array index access via dot notation", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { items: ["first", "second", "third"] } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.t("items.0"), "first");
  assert.equal(i18n.t("items.2"), "third");
});

test("Si18nCore t() treats empty string value as missing and falls back", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: {
      en: { greeting: "Hello" },
      fr: { greeting: "" }
    },
    lang: "fr",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.t("greeting"), "Hello");
});

test("Si18nCore t() applies multiple replacements in one call", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { msg: "%{greeting}, %{name}!" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.t("msg", { greeting: "Hello", name: "World" }), "Hello, World!");
});

test("Si18nCore t() handles numeric replacement values", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { count: "You have %{n} items" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.t("count", { n: 42 }), "You have 42 items");
});

test("Si18nCore t() does not mutate the stored message when applying replacements", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { tpl: "Hello %{name}" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  i18n.t("tpl", { name: "Ada" });
  // Template should be untouched for subsequent calls.
  assert.equal(i18n.t("tpl", { name: "Bob" }), "Hello Bob");
});

test("Si18nCore t() preserves dollar sign strings without regex substitution corruption", async () => {
  const i18n = new Si18nCore();
  await i18n.init({
    locales: {
      en: {
        price: "Total: %{amount}",
        discount: "Save %{pct} today (%{amount})"
      }
    },
    lang: "en"
  });

  assert.equal(i18n.t("price", { amount: "$100" }), "Total: $100");
  assert.equal(i18n.t("price", { amount: "$$5.00" }), "Total: $$5.00");
  assert.equal(i18n.t("price", { amount: "$' and text" }), "Total: $' and text");
  assert.equal(i18n.t("discount", { pct: "20%", amount: "$20" }), "Save 20% today ($20)");
});

test("Si18nCore t() safely handles keys with regex metacharacters and preserves unknown placeholders", async () => {
  const i18n = new Si18nCore();
  await i18n.init({
    locales: {
      en: {
        dotted: "Hello %{user.name} (%{status})",
        special: "Item %{item+id}"
      }
    },
    lang: "en"
  });

  assert.equal(i18n.t("dotted", { "user.name": "Ada" }), "Hello Ada (%{status})");
  assert.equal(i18n.t("special", { "item+id": "42" }), "Item 42");
});

// ─── LOCALE RESOLUTION PRIORITY

test("Si18nCore uses stored locale when URL returns null and storage has a match", async () => {
  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: () => null,
    storage: {
      getItem: () => "fr",
      setItem: () => undefined
    }
  });

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: true
  });

  assert.equal(i18n.getLocale(), "fr");
});

test("Si18nCore uses detectLanguage when URL, storage, and hardcoded lang all fail", async () => {
  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: () => null,
    storage: { getItem: () => null, setItem: () => undefined },
    detectLanguage: () => "fr"
  });

  await i18n.init({
    locales: EN_FR,
    lang: "de", // does not match any available locale
    fallbackLang: "en",
    saveLang: true
  });

  assert.equal(i18n.getLocale(), "fr");
});

test("Si18nCore falls back to fallbackLang when nothing else matches", async () => {
  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: () => null,
    storage: { getItem: () => null, setItem: () => undefined },
    detectLanguage: () => "zh" // does not match
  });

  await i18n.init({
    locales: EN_FR,
    lang: "de", // does not match
    fallbackLang: "en",
    saveLang: true
  });

  assert.equal(i18n.getLocale(), "en");
});

test("Si18nCore saveLang:false skips both storage read and write during init and setLocale", async () => {
  let getItemCalled = false;
  let setItemCalled = false;

  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: () => null,
    storage: {
      getItem: () => { getItemCalled = true; return "fr"; },
      setItem: () => { setItemCalled = true; }
    }
  });

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(getItemCalled, false, "getItem should not be called during init");

  await i18n.setLocale("fr");

  assert.equal(setItemCalled, false, "setItem should not be called by setLocale");
  assert.equal(i18n.getLocale(), "fr");
});

// ─── setLocale

test("Si18nCore setLocale throws when called before init", async () => {
  const i18n = new Si18nCore();
  await assert.rejects(
    () => i18n.setLocale("en"),
    /Call init before setLocale/
  );
});

test("Si18nCore setLocale falls back to fallbackLang for an unknown locale", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  await i18n.setLocale("zzz"); // not in availableLocales
  assert.equal(i18n.getLocale(), "en");
});

test("Si18nCore setLocale calls the reload dependency when reloadPage is true", async () => {
  let reloaded = false;

  const i18n = new Si18nCore(undefined, {
    reload: () => { reloaded = true; }
  });

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    reloadPage: true,
    saveLang: false
  });

  await i18n.setLocale("fr");
  assert.equal(reloaded, true);
  // After a page reload the locale on the instance doesn't change (reload() returns immediately).
  assert.equal(i18n.getLocale(), "en");
});

test("Si18nCore setLocale writes the new locale to storage", async () => {
  const stored = {};

  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: () => null,
    storage: {
      getItem: (key) => stored[key] ?? null,
      setItem: (key, value) => { stored[key] = value; }
    }
  });

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: true
  });

  await i18n.setLocale("fr");
  assert.equal(stored["lang"], "fr");
});

test("Si18nCore setLocale triggers translate and onLocaleChanged callbacks", async () => {
  const translateCalls = [];
  const onLocaleCalls = [];

  const i18n = new Si18nCore();

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false,
    translate: (inst) => { translateCalls.push(inst.getLocale()); },
    onLocaleChanged: (locale) => { onLocaleCalls.push(locale); }
  });

  await i18n.setLocale("fr");

  // Both callbacks fire once during init and once during setLocale.
  assert.deepEqual(translateCalls, ["en", "fr"]);
  assert.deepEqual(onLocaleCalls, ["en", "fr"]);
});

// ─── subscribe

test("Si18nCore subscribe listener is notified during init when subscribed before it", async () => {
  const i18n = new Si18nCore();
  const events = [];
  const unsub = i18n.subscribe((locale) => events.push(locale));

  await i18n.init({
    locales: { en: { name: "English" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  unsub();
  assert.deepEqual(events, ["en"]);
});

test("Si18nCore notifies all active subscribers on locale change", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  const a = [];
  const b = [];
  const unsub1 = i18n.subscribe((l) => a.push(l));
  const unsub2 = i18n.subscribe((l) => b.push(l));

  await i18n.setLocale("fr");

  unsub1();
  unsub2();

  assert.deepEqual(a, ["fr"]);
  assert.deepEqual(b, ["fr"]);
});

test("Si18nCore unsubscribe prevents further listener calls", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  const events = [];
  const unsub = i18n.subscribe((l) => events.push(l));

  await i18n.setLocale("fr"); // received
  unsub();
  await i18n.setLocale("en"); // must NOT be received

  assert.deepEqual(events, ["fr"]);
});

// ─── toJSON / getLocales — MUTATION ISOLATION

test("Si18nCore toJSON returns an independent snapshot", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: { en: { name: "English" } },
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  const snapshot = i18n.toJSON();
  snapshot.availableLocales.push("mutated");

  assert.deepEqual(i18n.getLocales(), ["en"]);
});

test("Si18nCore getLocales returns a copy that does not affect internal state", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: EN_FR,
    lang: "en",
    fallbackLang: "en",
    saveLang: false
  });

  const locales = i18n.getLocales();
  locales.push("hacked");

  assert.deepEqual(i18n.getLocales(), ["en", "fr"]);
});

// ─── localeLoader — ERROR HANDLING

test("Si18nCore localeLoader returning a non-object throws the appropriate error", async () => {
  const i18n = new Si18nCore(undefined, silentDeps());

  await assert.rejects(
    () =>
      i18n.init({
        localeLoader: async () => "not-an-object",
        availableLocales: ["en"],
        lang: "en",
        fallbackLang: "en"
      }),
    /not a valid object/
  );
});

test("Si18nCore localeLoader rejection is logged via logError and re-thrown", async () => {
  const loggedErrors = [];
  const loadError = new Error("Network failure");

  const i18n = new Si18nCore(undefined, {
    logError: (msg, err) => loggedErrors.push({ msg, err })
  });

  await assert.rejects(
    () =>
      i18n.init({
        localeLoader: async () => { throw loadError; },
        availableLocales: ["en"],
        lang: "en",
        fallbackLang: "en"
      }),
    (err) => {
      assert.equal(err, loadError);
      return true;
    }
  );

  assert.equal(loggedErrors.length, 1);
  assert.match(loggedErrors[0].msg, /Unable to load locale/);
  assert.equal(loggedErrors[0].err, loadError);
});
