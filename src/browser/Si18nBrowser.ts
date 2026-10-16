import Si18nCore, {
  type LocaleMessages,
  type Si18nCoreDependencies
} from "../core";
import { createDocsError } from "../core/Si18nCore";
import type { Si18nBrowserInitOptions } from "./types";

const SUPPORTED_AUTO_TRANSLATION_ATTRIBUTES: Record<string, keyof DOMStringMap> = {
  title: "si18nTitle",
  label: "si18nLabel",
  alt: "si18nAlt",
  "aria-label": "si18nAriaLabel",
  value: "si18nValue",
  content: "si18nContent",
  placeholder: "si18nPlaceholder"
};

const AUTO_TRANSLATION_ATTRIBUTE_ENTRIES = Object.entries(
  SUPPORTED_AUTO_TRANSLATION_ATTRIBUTES
) as Array<[string, keyof DOMStringMap]>;

interface BrowserOptions {
  activeClass: string;
  togglersSelector: string;
  isTogglerSelect: boolean;
}

const getBrowserLanguage = (): string | null => {
  return typeof navigator !== "undefined" ? navigator.language || null : null;
};

// Wrap localStorage access in try/catch so restricted browser contexts
// (sandboxed iframes, disabled cookies, private browsing quota limits) never crash.
const createSafeBrowserStorage = (): Si18nCoreDependencies["storage"] => {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage write errors in restricted/quota-limited environments.
        }
      }
    };
  } catch {
    return undefined;
  }
};

const createBrowserDependencies = (): Si18nCoreDependencies => {
  return {
    createPathLocaleLoader: (path) => {
      const normalizedBase = path.replace(/\/+$/, "");
      return async (locale) => {
        if (!locale || /[/\\0\r\n]|\.\./.test(locale)) {
          throw new Error(`Invalid locale identifier "${locale}".`);
        }
        const response = await fetch(`${normalizedBase}/${encodeURIComponent(locale)}.json`);
        if (!response.ok) {
          throw new Error(`Locale file for "${locale}" could not be loaded from "${path}".`);
        }
        return (await response.json()) as LocaleMessages;
      };
    },
    getLanguageFromUrl: (saveAs) => {
      if (typeof window === "undefined") return null;

      const searchParam = new URLSearchParams(window.location.search);
      return searchParam.get(saveAs);
    },
    detectLanguage: getBrowserLanguage,
    storage: createSafeBrowserStorage(),
    reload:
      typeof window !== "undefined"
        ? () => {
            window.location.reload();
          }
        : undefined
  };
};

// Moving internal helpers to module-scoped functions allows minifiers (esbuild/tsdown)
// to mangle their identifiers to single letters without changing the Si18nBrowser prototype.
function throwInvalidSelectorError(): never {
  throw createDocsError(
    "The togglersSelector option must be a valid selector and match at least one element."
  );
}

export class Si18nBrowser extends Si18nCore {
  private readonly browserOptions: BrowserOptions = {
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false
  };

  private togglersConfigured = false;
  private browserInitStarted = false;

  public constructor(options?: Si18nBrowserInitOptions) {
    super(undefined, createBrowserDependencies());

    if (options && typeof options === "object") {
      void this.init(options).catch(() => {});
    }
  }

  public override async init(options: Si18nBrowserInitOptions = {}): Promise<void> {
    if (this.isInitialized()) return;

    if (!this.browserInitStarted) {
      this.browserInitStarted = true;
      this.browserOptions.activeClass = options.activeClass ?? "";
      this.browserOptions.togglersSelector = options.togglersSelector ?? "";
      this.browserOptions.isTogglerSelect = options.isTogglerSelect ?? false;
    }

    try {
      await super.init(options);
    } catch (error) {
      this.browserInitStarted = false;
      throw error;
    }

    if (!this.togglersConfigured) {
      this.configureTogglers();
      this.togglersConfigured = true;
    }
  }

  public static async getJSON<T = LocaleMessages>(
    url: string,
    callback?: (value: T) => void
  ): Promise<T | void> {
    const response = await fetch(url);
    if (response.ok === false) {
      throw new Error(`Failed to load JSON from "${url}".`);
    }
    const payload = (await response.json()) as T;

    if (callback) {
      callback(payload);
      return;
    }

    return payload;
  }

  protected override beforeTranslate(): void {
    if (typeof document === "undefined") return;

    const localeData = this.getLocaleMessages(this.getLocale());
    const isRtl = Boolean(localeData?.rtl);

    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = this.getLocale();

    this.translateDataAttributes();
    this.updateActiveTogglerClass();
    this.updateSelectValue();
  }

  private translateDataAttributes(): void {
    if (typeof document === "undefined") return;

    const elements = document.querySelectorAll<HTMLElement>("[data-si18n]");

    for (const element of elements) {
      const jsonPath = element.dataset.si18n;
      if (!jsonPath) continue;

      const translated = this.t(jsonPath);
      if (typeof translated !== "string") continue;

      if (element.dataset.si18nDefault !== "false") {
        if (element.dataset.si18nHtml === "true") {
          element.innerHTML = translated;
        } else {
          element.textContent = translated;
        }
      }

      for (const [attributeName, datasetKey] of AUTO_TRANSLATION_ATTRIBUTE_ENTRIES) {
        if (typeof element.dataset[datasetKey] !== "undefined") {
          element.setAttribute(attributeName, translated);
        }
      }
    }
  }

  private configureTogglers(): void {
    if (typeof document === "undefined") return;

    if (!this.browserOptions.togglersSelector) return;

    if (this.browserOptions.isTogglerSelect) {
      this.configureSelectToggler();
      return;
    }

    const buttons = document.querySelectorAll<HTMLElement>(
      this.browserOptions.togglersSelector
    );

    if (buttons.length === 0) throwInvalidSelectorError();

    for (const button of buttons) {
      const locale = button.dataset.lang;
      if (!locale || !this.getLocales().includes(locale)) continue;

      button.addEventListener("click", () => {
        void this.setLocale(locale);
      });
    }

    this.updateActiveTogglerClass();
  }

  private configureSelectToggler(): void {
    if (typeof document === "undefined") return;

    const selectElement = document.querySelector<HTMLSelectElement>(
      this.browserOptions.togglersSelector
    );

    if (!selectElement) throwInvalidSelectorError();

    const availableLocales = this.getLocales();

    for (const option of selectElement.options) {
      if (!availableLocales.includes(option.value)) {
        option.disabled = true;
      }
    }

    this.updateSelectValue();

    selectElement.addEventListener("change", () => {
      const selectedLocale = selectElement.value;
      if (!availableLocales.includes(selectedLocale)) return;

      void this.setLocale(selectedLocale);
    });
  }

  private updateActiveTogglerClass(): void {
    if (typeof document === "undefined") return;

    if (!this.browserOptions.activeClass || !this.browserOptions.togglersSelector) {
      return;
    }

    if (this.browserOptions.isTogglerSelect) return;

    const activeLocale = this.getLocale();
    const buttons = document.querySelectorAll<HTMLElement>(
      this.browserOptions.togglersSelector
    );

    for (const button of buttons) {
      button.classList.remove(this.browserOptions.activeClass);
      if (button.dataset.lang === activeLocale) {
        button.classList.add(this.browserOptions.activeClass);
      }
    }
  }

  private updateSelectValue(): void {
    if (typeof document === "undefined") return;

    if (!this.browserOptions.isTogglerSelect || !this.browserOptions.togglersSelector) {
      return;
    }

    const selectElement = document.querySelector<HTMLSelectElement>(
      this.browserOptions.togglersSelector
    );

    if (!selectElement) return;

    selectElement.value = this.getLocale();
  }
}

export default Si18nBrowser;
