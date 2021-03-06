/*!
 * @license si18n.js - v1.2.0
 * Copyright (c) José dBruxelles <jd.bruxelles.dev/c>.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or
 * at https://jdbruxelles.mit-license.org
 *
 * Make translation management easier and more efficient.
 */
export default class Si18n {
  #noop() {} // Empty function to avoid undefined paramaters.
  #isInitialized = false;
  #options = {
    lang: "",
    fallbackLang: "",
    locales: {}, // Required
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false,
    saveLang: true,
    saveAs: "lang",
    translate: this.#noop, // Required
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
   * @param {string} [_options.lang] Active language to use. Do not define the
   * lang option if you want to use a language detector. Note: The lang option
   * priority is :
   *   1. URL param,
   *   2. Local saved lang,
   *   3. Hard coded lang,
   *   4. Navigator lang.
   * @param {string} [_options.fallbackLang=_options.lang] Fallback language.
   * @param {string} [_options.activeClass] Class to add to the active language.
   * @param {string} _options.togglersSelector Selector to the togglers elements.
   * @param {boolean} [_options.isTogglerSelect=false] Whether the toggler is a select or a button.
   * @param {boolean} [_options.saveLang=true] Whether to save the language in localStorage.
   * @param {string} [_options.saveAs="lang"] Name of the key to save the language in localStorage.
   * @param {function(string):string=} _options.translate Function that translate the text manually.
   * @param {function} [_options.onChange] Function that handle after each language change.
   * @returns {Si18n} The si18n object.
   */
  init(_options = {}) {
    if (this.#isInitialized) return; // Initialize once.

    const docsLink = "https://si18n.js.bruxelles.dev/#options";
    const optionsKeys = Object.keys(_options);

    if (optionsKeys.length === 0) {
      throw new Error(`No options provided. See docs ${docsLink}`);
    } else if (!(
      optionsKeys.includes("locales") ||
      optionsKeys.includes("translate"))
    ) {
      throw new Error(`Missing required options. See docs ${docsLink}`);
    }

    if (_options.fallbackLang) {
      this.#options.fallbackLang = _options.fallbackLang;
    } else {
      if (_options.lang) this.#options.fallbackLang = _options.lang;
      else throw new Error(`The fallback option is required when no lang option is set. See docs ${docsLink}`);
    }

    if (_options.translate) this.#options.translate = _options.translate;
    if (_options.locales) this.#options.locales = _options.locales;
    if (_options.saveAs) this.#options.saveAs = _options.saveAs;
    if (typeof _options.onChange === "function") {
      this.#options.callback = _options.onChange;
    }

    const searchParam = new URLSearchParams(window.location.search);
    const langInURL = searchParam.get(this.#options.saveAs);
    if (!Si18n.#isUndefined(_options.saveLang)) {
      this.#options.saveLang = _options.saveLang;
    }

    if (langInURL !== null && !Si18n.#isUndefined(this.#options.locales[langInURL])) {
      this.#options.lang = langInURL;
    } else if (this.#options.saveLang) {
      this.#options.lang = localStorage.getItem(this.#options.saveAs) || _options.lang;
    } else if (_options.lang) {
      this.#options.lang = _options.lang;
    } else {
      // Use the default language of the navigator.
      this.#options.lang = navigator.language.substring(0, 2);
    }

    this.#translate();
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
   * Sets the given language and applies the change.
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
   * Returns the list of all available languages.
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
   * @param {string} [lang] the language to set.
   * @private
   */
  #translate(lang = this.#options.lang) {
    // Cannot translate to a language that doesn't exist.
    if (lang && !Si18n.#isUndefined(this.#options.locales[lang])) {
      this.#options.lang = lang;
    } else {
      // Set fallback language.
      this.#options.lang = this.#options.fallbackLang;
    }

    let _rtl = this.#options.locales[this.#options.lang].rtl;
    document.documentElement.lang = this.getLocale();
    document.documentElement.dir = _rtl === "true" ? "rtl" : "ltr";

    // Auto translate using the given JSONPath in data-si18n attribute.
    // When using this option, no need to write the script manually
    // except if you want use the string for other purposes
    // (e.g.: title, aria-label attributes, etc.).
    const htmlTags = document.querySelectorAll("[data-si18n]");
    if (htmlTags.length > 0) {
      htmlTags.forEach((element) => {
        const JSONPath = element.dataset.si18n;
        const text = this.t(JSONPath);
        if (element.dataset.si18nDefault !== "false") {
          if (element.dataset.si18nHtml === "true") {
            element.innerHTML = text;
          } else {
            element.textContent = text;
          }
        }

        if (!Si18n.#isUndefined(element.dataset.si18nTitle))
          element.setAttribute("title", text);

        if (!Si18n.#isUndefined(element.dataset.si18nLabel))
          element.setAttribute("aria-label", text);

        if (!Si18n.#isUndefined(element.dataset.si18nValue))
          element.setAttribute("value", text);
      });
    }

    this.#options.translate();
  }

  /**
   * Returns the translation string at the given key.
   * @param {string} JSONPath the object property selector.
   * @param {object} replacements the object containing replacement values.
   * @returns {string|object} The translation at the given key.
   */
  t(JSONPath, replacements) {
    let fallbackLangChecked = false;
    let value = this.#options.locales[this.#options.lang];

    // To process nested path selector.
    const pathItems = JSONPath.split(".");

    try {
      for (let i = 0; i < pathItems.length; i++) {
        value = value[pathItems[i]];
        if (Si18n.#isUndefined(value) || value === "") {
          if (!fallbackLangChecked) {
            value = this.#getFallbackObj();
            fallbackLangChecked = true;
            for (const p of pathItems) value = value[p];
            if (Si18n.#isUndefined(value) || value === "")
              this.#triggerErrorPathNotFound(JSONPath);
          }
        }
      }
    } catch (error) {
      this.#triggerErrorPathNotFound(JSONPath);
    }

    if (replacements && typeof replacements === "object") {
      for (const key in replacements)
        value = value.replace(new RegExp(`\\%{${key}\\}`, "g"), replacements[key]);
    }

    return value;
  }

  /**
   * Throws an error for the not found translation.
   * @param {string} JSONPath the object property selector.
   * @private
   */
  #triggerErrorPathNotFound(JSONPath) {
    console.error('The path "' + JSONPath + '" was not found in the current language (' +
      this.#options.lang + '), nor in the fallback language (' +
      this.#options.fallbackLang + ').');
  }

  /**
   * Returns the type of the given value.
   * @param {*} value the value to check.
   * @returns {boolean} the type of the value.
   * @private
   */
  static #isUndefined(value) {
    return typeof value === "undefined";
  }

  /**
   * Returns the options of the instance.
   * @returns {object} The options of the instance.
   */
  toJSON() {
    return this.#options;
  }
}
