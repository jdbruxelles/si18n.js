import type {
  LocaleCollection,
  LocaleListener,
  LocaleLoader,
  LocaleMessages,
  SerializedSi18nOptions,
  Si18nCoreDependencies,
  Si18nInitOptions,
  Si18nLike,
  TranslationReplacements,
  TranslationValue
} from "./types";

// Using `let` instead of `const` prevents esbuild from inlining this as a
// compile-time literal, so the variable reference is preserved in bundles.
export let DOCS_LINK = "https://si18n.js.bruxelles.dev/#options";

interface InternalOptions {
  lang: string;
  fallbackLang: string;
  locales: LocaleCollection;
  availableLocales: string[];
  path: string | null;
  saveLang: boolean;
  saveAs: string;
  reloadPage: boolean;
  translate: (instance: Si18nLike) => void;
  onLocaleChanged: (locale: string, instance: Si18nLike) => void;
  localeLoader?: LocaleLoader;
}

interface InternalDependencies {
  createPathLocaleLoader?: (path: string) => LocaleLoader;
  getLanguageFromUrl: (saveAs: string) => string | null;
  detectLanguage: () => string | null;
  storage?: Si18nCoreDependencies["storage"];
  reload: () => void;
  logError: (message: string, error?: unknown) => void;
}

const noop = (): void => {
  // Intentionally empty callback.
};

const defaultLogError = (message: string, error?: unknown): void => {
  if (error) {
    console.error(message, error);
    return;
  }
  console.error(message);
};

// Reject arrays so `locales` and loaded locale payloads must be plain key-value records.
const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOwn = (obj: object, key: PropertyKey): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

// Disallow path separators, traversal segments, and control characters in locale identifiers
// to prevent path traversal in filesystem/URL locale loaders.
const isSafeLocaleToken = (locale: unknown): locale is string => {
  if (typeof locale !== "string") return false;
  const trimmed = locale.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return false;
  return !/[/\\0\r\n]|\.\./.test(trimmed);
};

// Centralize error creation with DOCS_LINK to avoid repeating template strings across bundles.
export const createDocsError = (message: string): Error => {
  return new Error(`${message} See docs ${DOCS_LINK}`);
};

// Moving internal helpers to module-scoped functions allows minifiers (esbuild/tsdown)
// to mangle their identifiers to single letters without changing the Si18nCore prototype.
const validateInitOptions = (options: Si18nInitOptions): void => {
  const optionKeys = Object.keys(options);
  if (optionKeys.length === 0) {
    throw createDocsError("No options provided.");
  }

  if (typeof options.fallbackLang !== "undefined" && typeof options.fallbackLang !== "string") {
    throw createDocsError("The fallbackLang option must be a string.");
  }

  if (typeof options.lang !== "undefined" && typeof options.lang !== "string") {
    throw createDocsError("The lang option must be a string.");
  }

  if (
    typeof options.fallbackLang === "undefined" &&
    typeof options.lang === "undefined"
  ) {
    throw createDocsError("The lang option is required when no fallbackLang option is set.");
  }

  if (typeof options.locales !== "undefined") {
    if (
      !isObjectRecord(options.locales) ||
      Object.keys(options.locales).some((loc) => !isSafeLocaleToken(loc) || !isObjectRecord(options.locales![loc]))
    ) {
      throw createDocsError("The locales option must be an object.");
    }
  }

  if (typeof options.availableLocales !== "undefined") {
    if (
      !Array.isArray(options.availableLocales) ||
      options.availableLocales.some((loc) => !isSafeLocaleToken(loc))
    ) {
      throw createDocsError("The availableLocales option must be an array.");
    }
  }

  if (typeof options.path !== "undefined" && typeof options.path !== "string") {
    throw createDocsError("The path option must be a string.");
  }

  if (typeof options.saveAs !== "undefined") {
    if (typeof options.saveAs !== "string" || options.saveAs.trim() === "") {
      throw createDocsError("The saveAs option must be a non-empty string.");
    }
  }

  if (typeof options.translate !== "undefined" && typeof options.translate !== "function") {
    throw createDocsError("The translate option must be a function.");
  }

  if (
    typeof options.onLocaleChanged !== "undefined" &&
    typeof options.onLocaleChanged !== "function"
  ) {
    throw createDocsError("The onLocaleChanged option must be a function.");
  }

  if (typeof options.localeLoader !== "undefined" && typeof options.localeLoader !== "function") {
    throw createDocsError("The localeLoader option must be a function.");
  }

  const hasAutoLoader =
    typeof options.path === "string" ||
    typeof options.localeLoader === "function";

  if (!options.locales && !hasAutoLoader) {
    throw createDocsError("Missing required options.");
  }

  if (
    typeof options.path === "string" &&
    (!Array.isArray(options.availableLocales) || options.availableLocales.length === 0)
  ) {
    throw createDocsError("The availableLocales option is required when using the path option.");
  }
};

const isMissingValue = (value: TranslationValue | undefined): boolean => {
  return typeof value === "undefined" || value === "";
};

const readByPath = (
  root: TranslationValue | undefined,
  path: string
): TranslationValue | undefined => {
  if (!root) return undefined;

  const pathItems = path.split(".").filter(Boolean);
  if (pathItems.length === 0) return undefined;

  let value: TranslationValue | undefined = root;

  for (const pathItem of pathItems) {
    if (
      pathItem === "__proto__" ||
      pathItem === "prototype"
    ) {
      return undefined;
    }

    if (!isObjectRecord(value) && !Array.isArray(value)) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const parsedIndex = Number(pathItem);
      if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
        return undefined;
      }
      value = value[parsedIndex];
      continue;
    }

    // Only read own properties on object records to prevent prototype chain leakage
    // (e.g. `t("toString")` or `t("__proto__.polluted")`).
    if (!hasOwn(value, pathItem)) return undefined;

    value = value[pathItem] as TranslationValue | undefined;
    if (typeof value === "undefined") return undefined;
  }

  return value;
};

const applyReplacements = (
  message: string,
  replacements: TranslationReplacements
): string => {
  return message.replace(/%\{([^{}]+)\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }
    if (Object.prototype.hasOwnProperty.call(replacements, rawKey)) {
      return String(replacements[rawKey]);
    }
    return match;
  });
};

export class Si18nCore implements Si18nLike {
  public static readonly version = "2.0.0-beta.0";

  protected readonly options: InternalOptions = {
    lang: "",
    fallbackLang: "",
    locales: {},
    availableLocales: [],
    path: null,
    saveLang: true,
    saveAs: "lang",
    reloadPage: false,
    translate: noop,
    onLocaleChanged: noop
  };

  protected initialized = false;

  private readonly dependencies: InternalDependencies;
  private readonly localeListeners = new Set<LocaleListener>();
  private initPromise: Promise<void> | null = null;
  private readonly loadingLocales = new Map<string, Promise<void>>();
  private readonly localeLookupMap = new Map<string, string>();
  private setLocaleRequestId = 0;

  public constructor(
    initialOptions?: Si18nInitOptions,
    dependencies: Si18nCoreDependencies = {}
  ) {
    this.dependencies = {
      createPathLocaleLoader: dependencies.createPathLocaleLoader,
      getLanguageFromUrl: dependencies.getLanguageFromUrl ?? (() => null),
      detectLanguage: dependencies.detectLanguage ?? (() => null),
      storage: dependencies.storage,
      reload: dependencies.reload ?? noop,
      logError: dependencies.logError ?? defaultLogError
    };

    if (initialOptions && typeof initialOptions === "object") {
      // Auto-initialize when constructor options are provided. Errors are already reported
      // via logError and catching prevents uncaught promise rejections when callers use constructor auto-init.
      void this.init(initialOptions).catch(() => {});
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async init(options: Si18nInitOptions = {}): Promise<void> {
    if (this.initialized) return;
    // Deduplicate concurrent init() calls (e.g. constructor auto-init + React StrictMode effect).
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      validateInitOptions(options);
      this.applyInitOptions(options);

      this.options.lang = await this.resolveInitialLocale(options.lang);

      // Load fallbackLang and active lang in parallel when they differ to avoid a 2-RTT waterfall.
      // Invoking fallbackLang first preserves deterministic loader call order in synchronous steps.
      if (this.options.lang !== this.options.fallbackLang) {
        await Promise.all([
          this.ensureLocaleLoaded(this.options.fallbackLang),
          this.ensureLocaleLoaded(this.options.lang)
        ]);
      } else {
        await this.ensureLocaleLoaded(this.options.fallbackLang);
      }

      this.initialized = true;
      this.applyTranslation();
      this.options.onLocaleChanged(this.options.lang, this);
      this.notifyLocaleListeners(this.options.lang);
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  public async setLocale(locale: string): Promise<void> {
    if (!this.initialized) {
      throw createDocsError("Call init before setLocale.");
    }

    const requestId = ++this.setLocaleRequestId;
    const nextLocale = this.matchAvailableLocale(locale) ?? this.options.fallbackLang;

    if (this.options.saveLang) {
      await this.setStoredLocale(nextLocale);
    }

    if (requestId !== this.setLocaleRequestId) return;

    if (this.options.reloadPage) {
      this.dependencies.reload();
      return;
    }

    await this.ensureLocaleLoaded(nextLocale);

    // Ignore stale completions when a newer setLocale() call was issued concurrently.
    if (requestId !== this.setLocaleRequestId) return;

    this.options.lang = nextLocale;
    this.applyTranslation();
    this.options.onLocaleChanged(nextLocale, this);
    this.notifyLocaleListeners(nextLocale);
  }

  public getLocale(): string {
    return this.options.lang;
  }

  public getLocales(): string[] {
    return [...this.options.availableLocales];
  }

  public t(
    path: string,
    replacements?: TranslationReplacements
  ): TranslationValue {
    const localeObj = this.getLocaleMessages(this.options.lang);
    const fallbackObj = this.getLocaleMessages(this.options.fallbackLang);

    let value = readByPath(localeObj, path);
    if (isMissingValue(value)) {
      value = readByPath(fallbackObj, path);
    }

    if (isMissingValue(value)) {
      this.dependencies.logError(
        `The path "${path}" was not found in the current language (${this.options.lang}), nor in the fallback language (${this.options.fallbackLang}).`
      );
      return path;
    }

    if (typeof value === "string" && replacements) {
      return applyReplacements(value, replacements);
    }

    return value as TranslationValue;
  }

  public subscribe(listener: LocaleListener): () => void {
    this.localeListeners.add(listener);
    return (): void => {
      this.localeListeners.delete(listener);
    };
  }

  public toJSON(): SerializedSi18nOptions {
    return {
      lang: this.options.lang,
      fallbackLang: this.options.fallbackLang,
      locales: this.options.locales,
      availableLocales: [...this.options.availableLocales],
      path: this.options.path,
      saveLang: this.options.saveLang,
      saveAs: this.options.saveAs,
      reloadPage: this.options.reloadPage
    };
  }

  protected beforeTranslate(): void {
    // Browser adapter overrides this hook for DOM updates.
  }

  protected getLocaleMessages(locale: string): LocaleMessages | undefined {
    return hasOwn(this.options.locales, locale)
      ? this.options.locales[locale]
      : undefined;
  }

  private notifyLocaleListeners(locale: string): void {
    this.localeListeners.forEach((listener) => {
      listener(locale);
    });
  }

  private applyInitOptions(options: Si18nInitOptions): void {
    if (options.locales) this.options.locales = options.locales;

    const availableLocales = options.availableLocales ?? Object.keys(this.options.locales);
    this.options.availableLocales = [...new Set(availableLocales)];

    if (this.options.availableLocales.length === 0) {
      throw createDocsError("No available locales were found.");
    }

    this.localeLookupMap.clear();
    for (const loc of this.options.availableLocales) {
      const lower = loc.toLowerCase();
      if (!this.localeLookupMap.has(lower)) {
        this.localeLookupMap.set(lower, loc);
      }
    }

    const fallbackLangInput =
      options.fallbackLang ??
      options.lang ??
      this.options.fallbackLang;
    const resolvedFallbackLang = this.matchAvailableLocale(fallbackLangInput);

    if (!resolvedFallbackLang) {
      throw createDocsError(
        "The fallbackLang option must match one of the availableLocales."
      );
    }

    this.options.fallbackLang = resolvedFallbackLang;
    this.options.path = options.path ?? null;
    this.options.saveLang = options.saveLang ?? true;
    this.options.saveAs = options.saveAs ?? "lang";
    this.options.reloadPage = options.reloadPage ?? false;
    this.options.translate = options.translate ?? noop;
    this.options.onLocaleChanged = options.onLocaleChanged ?? noop;
    this.options.localeLoader = options.localeLoader;

    if (!this.options.localeLoader && this.options.path) {
      if (!this.dependencies.createPathLocaleLoader) {
        throw createDocsError("No locale loader was configured for path loading.");
      }
      this.options.localeLoader = this.dependencies.createPathLocaleLoader(this.options.path);
    }
  }

  private async resolveInitialLocale(hardcodedLocale?: string): Promise<string> {
    const localeFromUrl = this.matchAvailableLocale(
      this.dependencies.getLanguageFromUrl(this.options.saveAs)
    );
    if (localeFromUrl) return localeFromUrl;

    if (this.options.saveLang) {
      const storedLocale = this.matchAvailableLocale(await this.getStoredLocale());
      if (storedLocale) return storedLocale;
    }

    const localeFromCode = this.matchAvailableLocale(hardcodedLocale);
    if (localeFromCode) return localeFromCode;

    const detectedLocale = this.matchAvailableLocale(this.dependencies.detectLanguage());
    if (detectedLocale) return detectedLocale;

    return this.options.fallbackLang;
  }

  private async getStoredLocale(): Promise<string | null> {
    if (!this.dependencies.storage) return null;

    const value = this.dependencies.storage.getItem(this.options.saveAs);
    return Promise.resolve(value);
  }

  private async setStoredLocale(locale: string): Promise<void> {
    if (!this.dependencies.storage) return;

    const result = this.dependencies.storage.setItem(this.options.saveAs, locale);
    await Promise.resolve(result);
  }

  private matchAvailableLocale(locale: string | null | undefined): string | null {
    if (!locale) return null;

    const trimmedLocale = locale.trim();
    if (!trimmedLocale) return null;

    const normalizedLocales = new Set<string>();
    normalizedLocales.add(trimmedLocale);
    normalizedLocales.add(trimmedLocale.toLowerCase());

    const languageToken = trimmedLocale.split(/[-_.]/)[0];
    if (languageToken) {
      normalizedLocales.add(languageToken.toLowerCase());
    }

    for (const candidate of normalizedLocales) {
      const match = this.localeLookupMap.get(candidate.toLowerCase());
      if (match) return match;
    }

    return null;
  }

  private async ensureLocaleLoaded(locale: string): Promise<void> {
    if (!isSafeLocaleToken(locale)) {
      throw new Error(`Invalid locale "${String(locale)}".`);
    }
    if (hasOwn(this.options.locales, locale) && this.options.locales[locale]) return;

    if (!this.options.localeLoader) {
      throw createDocsError(
        `No locale loader found for "${locale}". Provide locales or a path/localeLoader option.`
      );
    }

    const existingLoad = this.loadingLocales.get(locale);
    if (existingLoad) {
      await existingLoad;
      return;
    }

    const loadTask = (async () => {
      try {
        const loadedLocale = await this.options.localeLoader!(locale);
        if (!isObjectRecord(loadedLocale)) {
          throw new Error(`Locale "${locale}" is not a valid object.`);
        }
        this.options.locales[locale] = loadedLocale as LocaleMessages;
      } catch (error) {
        this.dependencies.logError(`Unable to load locale "${locale}".`, error);
        throw error;
      } finally {
        this.loadingLocales.delete(locale);
      }
    })();

    this.loadingLocales.set(locale, loadTask);
    await loadTask;
  }

  private applyTranslation(): void {
    this.beforeTranslate();
    this.options.translate(this);
  }
}

export default Si18nCore;
