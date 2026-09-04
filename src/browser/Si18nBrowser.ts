import Si18nCore, {
  type LocaleMessages,
  type Si18nCoreDependencies,
  DOCS_LINK
} from "../core";
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

interface BrowserOptions {
  activeClass: string;
  togglersSelector: string;
  isTogglerSelect: boolean;
}

const getBrowserLanguage = (): string | null => {
  return navigator.language || null;
};

const createBrowserDependencies = (): Si18nCoreDependencies => {
  return {
    createPathLocaleLoader: (path) => {
      return async (locale) => {
        const response = await fetch(`${path}/${locale}.json`);
        if (!response.ok) {
          throw new Error(`Locale file for \"${locale}\" could not be loaded from \"${path}\".`);
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
    storage:
      typeof localStorage !== "undefined"
        ? {
            getItem: (key) => localStorage.getItem(key),
            setItem: (key, value) => localStorage.setItem(key, value)
          }
        : undefined,
    reload:
      typeof window !== "undefined"
        ? () => {
            window.location.reload();
          }
        : undefined
  };
};

export class Si18nBrowser extends Si18nCore {
  private readonly browserOptions: BrowserOptions = {
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false
  };

  private togglersConfigured = false;

  public constructor(options?: Si18nBrowserInitOptions) {
    super(undefined, createBrowserDependencies());

    if (options && typeof options === "object") {
      void this.init(options);
    }
  }

  public override async init(options: Si18nBrowserInitOptions = {}): Promise<void> {
    this.browserOptions.activeClass = options.activeClass ?? "";
    this.browserOptions.togglersSelector = options.togglersSelector ?? "";
    this.browserOptions.isTogglerSelect = options.isTogglerSelect ?? false;

    await super.init(options);

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

    elements.forEach((element) => {
      const jsonPath = element.dataset.si18n;
      if (!jsonPath) return;

      const translated = this.t(jsonPath);
      if (typeof translated !== "string") return;

      if (element.dataset.si18nDefault !== "false") {
        if (element.dataset.si18nHtml === "true") {
          element.innerHTML = translated;
        } else {
          element.textContent = translated;
        }
      }

      Object.entries(SUPPORTED_AUTO_TRANSLATION_ATTRIBUTES).forEach(
        ([attributeName, datasetKey]) => {
          if (typeof element.dataset[datasetKey] !== "undefined") {
            element.setAttribute(attributeName, translated);
          }
        }
      );
    });
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

    if (buttons.length === 0) this.throwInvalidSelectorError();

    buttons.forEach((button) => {
      const locale = button.dataset.lang;
      if (!locale || !this.getLocales().includes(locale)) return;

      button.addEventListener("click", () => {
        void this.setLocale(locale);
      });
    });

    this.updateActiveTogglerClass();
  }

  private configureSelectToggler(): void {
    if (typeof document === "undefined") return;

    const selectElement = document.querySelector<HTMLSelectElement>(
      this.browserOptions.togglersSelector
    );

    if (!selectElement) this.throwInvalidSelectorError();

    const availableLocales = this.getLocales();

    Array.from(selectElement.options).forEach((option) => {
      if (!availableLocales.includes(option.value)) {
        option.disabled = true;
      }
    });

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

    buttons.forEach((button) => {
      button.classList.remove(this.browserOptions.activeClass);
      if (button.dataset.lang === activeLocale) {
        button.classList.add(this.browserOptions.activeClass);
      }
    });
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

  private throwInvalidSelectorError(): never {
    throw new Error(
      "The togglersSelector option must be a valid selector and match at least one element. " +
        `See docs ${DOCS_LINK}`
    );
  }
}

export default Si18nBrowser;
