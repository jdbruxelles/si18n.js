/*!
 * @license si18n.js - v1.1.1
 * Copyright (c) José dBruxelles <jd.bruxelles.dev/c>.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or
 * at https://jdbruxelles.mit-license.org
 *
 * Make translation management easier and more efficient.
 */
export default class si18n {
  #noop() {} // Empty function to avoid undefined paramaters.
  #isInitialized = false;
  #options = {
    lang: "", // do not define the lang option if you want to use a language detector.
    fallbackLang: "",
    locales: {},
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false,
    saveLang: true,
    saveAs: "lang",
    translate: this.#noop,
    callback: this.#noop
  };

  /**
   * Exactly the same as the init method. When you use the constructor,
   * don't use the init method. Note that the init method is faster.
   */
  constructor(_options) {
    if (typeof _options === "object") {
      setTimeout(() => { // Wait for the init method to be ready.
        this.init(_options);
      }, 50);
    }
  }

  /**
   * Initializes the si18n object.
   * @param {object} _options Options to initialize the si18n object.
   * @param {object} _options.locales Object containing local translations.
   * @param {string} [_options.lang] Active language to use.
   * @param {string} [_options.fallbackLang=_options.lang] Fallback language.
   * @param {string} [_options.activeClass] Class to add to the active language.
   * @param {string} _options.togglersSelector Selector to the togglers elements.
   * @param {boolean} [_options.isTogglerSelect=false] Whether the toggler is a select or a button.
   * @param {boolean} [_options.saveLang=true] Whether to save the language in localStorage.
   * @param {string} [_options.saveAs="lang"] Name of the key to save the language in localStorage.
   * @param {function(string):string=} _options.translate Function that translate the text manually.
   * @param {function} [_options.onChange] Function that handle after each language change.
   * @returns {si18n} The si18n object.
   */
  init(_options = {}) {
    const docsLink = "https://si18n.js.bruxelles.dev/#options";
    const optionsKeys = Object.keys(_options);

    if (optionsKeys.length === 0) {
      throw new Error(`No options provided. See docs ${docsLink}`);
    } else if (!(
      optionsKeys.includes("locales") ||
      optionsKeys.includes("lang") ||
      optionsKeys.includes("translate"))
    ) {
      throw new Error(`Missing mandatory options. See docs ${docsLink}`);
    }

    if (this.#isInitialized) return; // Initialize once.
    if (_options.locales) this.#options.locales = _options.locales;
    if (_options.saveAs) this.#options.saveAs = _options.saveAs;
    if (typeof _options.onChange === "function") {
      this.#options.callback = _options.onChange;
    }

    const searchParam = new URLSearchParams(window.location.search);
    const langInURL = searchParam.get(this.#options.saveAs);
    if (typeof _options.saveLang !== "undefined") {
      this.#options.saveLang = _options.saveLang;
    }

    if (langInURL !== null && typeof this.#options.locales[langInURL] !== "undefined") {
      this.#options.lang = langInURL;
    } else if (this.#options.saveLang) {
      this.#options.lang = localStorage.getItem(this.#options.saveAs) || _options.lang;
    } else if (_options.lang) {
      this.#options.lang = _options.lang;
    } else {
      // Use the default language of the navigator.
      this.#options.lang = navigator.language.substring(0, 2);
    }

    if (_options.translate) this.#options.translate = _options.translate;
    if (_options.fallbackLang) this.#options.fallbackLang = _options.fallbackLang;
    else this.#options.fallbackLang = this.#options.lang;

    this.#options.translate();
    this.#options.callback();
    this.#isInitialized = true;

    // Configure buttons which will switch the language.
    if (typeof _options.togglersSelector === "string") {
      if (_options.isTogglerSelect) {
        const selectEl = document.querySelector(_options.togglersSelector);
        const optionSelector = `option[value="${this.#options.lang}"]`;
        const activeOption = selectEl.querySelector(optionSelector);
        activeOption.setAttribute("selected", true);

        selectEl.querySelectorAll("option").forEach((option) => {
          if (!this.getLocales().includes(option.value)) {
            option.setAttribute("disabled", true);
          }
        });

        // Remove the selected attribute when option changes.
        selectEl.addEventListener("change", () => {
          activeOption.removeAttribute("selected");
        }, { once: true });

        selectEl.addEventListener("change", () => {
          const checkedOption = selectEl.querySelector("option:checked");
          if (!this.getLocales().includes(checkedOption.value)) return;
          this.setLocale(checkedOption.value);
        });
      } else {
        const buttons = document.querySelectorAll(_options.togglersSelector);
        const hasActiveClass = typeof _options.activeClass === "string";

        if (hasActiveClass) {
          for (const button of buttons.values()) {
            if (button.dataset.lang === this.#options.lang) {
              button.classList.add(_options.activeClass);
            }
          }
        }

        buttons.forEach((button) => {
          if (this.getLocales().includes(button.dataset.lang)) {
            button.addEventListener("click", () => {
              if (hasActiveClass) {
                buttons.forEach((button_) => {
                  button_.classList.remove(_options.activeClass);
                });
                button.classList.add(_options.activeClass);
              }
              this.setLocale(button.dataset.lang);
            });
          }
        });
      }
    }
  }

  /**
   * Sets the given language and translates.
   * @param {string} lang the language to set.
   */
  setLocale(lang) {
    this.#translate(lang);
    if (this.#options.saveLang) {
      localStorage.setItem(this.#options.saveAs, lang);
    }
  }

  /**
   * Returns the current language.
   * @returns {string} The current language.
   */
  getLocale() {
    return this.#options.lang;
  }

  /**
   * Returns the list of available languages.
   * @returns {object[]} The list of available languages.
   */
  getLocales() {
    return Object.keys(this.#options.locales);
  }

  /**
   * Returns the texts object for the fallback language.
   * @returns {string} The fallback language object.
   * @private
   */
  #getFallbackObj() {
    return this.#options.locales[this.#options.fallbackLang];
  }

  /**
   * Sets the given language as the current and call
   * the translate method option to make the translation.
   * @param {string} lang the language to set.
   * @private
   */
  #translate(lang) {
    // Cannot translate to a language that doesn't exist.
    if (lang && typeof this.#options.locales[lang] !== "undefined") {
      this.#options.lang = lang;
    } else {
      // Set fallback language.
      this.#options.lang = this.#options.fallbackLang;
    }
    this.#options.translate();
  }

  /**
   * Returns the translation at the given key.
   * @param {string} JSONPath the object property selector.
   * @returns {string|object} The translation at the given key.
   */
  t(JSONPath) {
    let value = this.#options.locales[this.#options.lang];

    // Process nested path selector.
    if (JSONPath.includes(".")) {
      try {
        const pathItems = JSONPath.split(".");
        for (let i = 0; i < pathItems.length; i++) {
          if (typeof value === "undefined") {
            value = this.#getFallbackObj();
            i = 0;
          }
          value = value[pathItems[i]];
        }
      } catch (error) {
        throw new Error(`The given path does not exist in the current language,
          nor in the fallback language. JSON selector: ${JSONPath}`);
      }
      return value || "";
    }

    // Process simple path selector
    const v = value && value[JSONPath];
    if (typeof value === "undefined" || v === undefined || v === "") {
      // Use the fallback language when the selected is not available.
      value = this.#getFallbackObj();
    }
    return value[JSONPath];
  }

  /**
   * Returns the options of the si18n object.
   * @returns {object} The options of the si18n object.
   */
  toJSON() {
    return this.#options;
  }
}
