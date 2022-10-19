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
  static version = "1.3.0";
  #noop() {} // Empty function to avoid undefined paramaters.
  #isInitialized = false;
  #options = {
    lang: "",
    fallbackLang: "",
    locales: {}, // Required
    availableLocales: [],
    path: null,
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false,
    saveLang: true,
    saveAs: "lang",
    translate: this.#noop, // Required
    callback: this.#noop // used as onLocaleChanged method
  };

  /**
   * Exactly the same as the `init` method. When you use the `constructor`,
   * don't use the `init` method, please. Note that the `init` method is faster.
   * See the `init` method for the documentation.
   */
  constructor(_options) {
    if (typeof _options === "object") {
      setTimeout(() => { // Wait for the `init` method to be ready.
        this.init(_options);
      }, 50);
    }
  }

  /**
   * Initializes the si18n object.
   * @param {object} _options Options to initialize the si18n object.
   * @param {object} _options.locales Object containing locale translations.
   * @param {string} [_options.lang] Active language to use. Do not define the
   * `lang` option if you want to use a language detector. Note: The `lang`
   * option priority is:
   *   1. URL param,
   *   2. Local saved lang,
   *   3. Hard coded lang,
   *   4. Navigator lang.
   * @param {string} [_options.fallbackLang=_options.lang] Fallback language.
   * @param {string} [_options.path] Path to the JSON files.
   * @param {string} [_options.availableLocales] List of available languages.
   * @param {string} [_options.activeClass] Class to add to the active language.
   * @param {string} _options.togglersSelector Selector to the togglers elements.
   * @param {boolean} [_options.isTogglerSelect=false] Whether the toggler is a select or a button.
   * @param {boolean} [_options.saveLang=true] Whether to save the language in localStorage.
   * @param {string} [_options.saveAs="lang"] Name of the key to save the language in localStorage.
   * @param {function(string=):string=} _options.translate Function that translate the text manually.
   * @param {function():void} [_options.onLocaleChanged] Function that handle after each language change.
   */
  init(_options = {}) {
    if (this.#isInitialized) return; // Initialize once.

    const docsLink = "https://si18n.js.bruxelles.dev/#options";
    const optionsKeys = Object.keys(_options);
    const autoLoad = optionsKeys.includes("path");
    const throwInvalidSelector = () => {
      throw new Error("The togglersSelector option must be a valid selector." +
        " Or you may forget to add the selected HTML element(s). See docs " +
        docsLink);
    };

    if (optionsKeys.length === 0) {
      throw new Error(`No options provided. See docs ${docsLink}`);
    } else if (!autoLoad && !optionsKeys.includes("locales")) {
      throw new Error(`Missing required options. See docs ${docsLink}`);
    }

    if (_options.fallbackLang) {
      if (typeof _options.fallbackLang !== "string") {
        throw new Error(`The fallbackLang option must be a string. See docs ${docsLink}`);
      }
      this.#options.fallbackLang = _options.fallbackLang;
    } else {
      if (_options.lang) this.#options.fallbackLang = _options.lang;
      else throw new Error(`The lang option is required when no fallbackLang option is set. See docs ${docsLink}`);
    }

    if (_options.locales) {
      if (!autoLoad && typeof _options.locales !== "object") {
        throw new Error(`The locales option must be an object. See docs ${docsLink}`);
      }
      this.#options.locales = _options.locales;
    }

    this.#options.availableLocales = _options.availableLocales || this.getLocales();

    if (_options.translate) this.#options.translate = _options.translate;
    if (_options.saveAs) this.#options.saveAs = _options.saveAs;
    if (typeof _options.onLocaleChanged === "function") {
      this.#options.callback = _options.onLocaleChanged;
    }

    const searchParam = new URLSearchParams(window.location.search);
    const langInURL = searchParam.get(this.#options.saveAs);
    if (!Si18n.#isUndefined(_options.saveLang)) {
      this.#options.saveLang = _options.saveLang;
    }

    if (langInURL !== null && this.#options.availableLocales.includes(langInURL)) {
      this.#options.lang = langInURL;
    } else if (this.#options.saveLang) {
      this.#options.lang = localStorage.getItem(this.#options.saveAs) || _options.lang;
    } else if (_options.lang) {
      this.#options.lang = _options.lang;
    } else {
      // Use the default language of the navigator.
      this.#options.lang = navigator.language.substring(0, 2);
    }

    if (autoLoad) {
      // path option required on autoLoad mode.
      if (typeof _options.path !== "string") {
        throw new Error(`The path option must be a string. See docs ${docsLink}`);
      }

      if ( // availableLocales option required on autoLoad mode.
        !Array.isArray(_options.availableLocales) ||
        (Array.isArray(_options.availableLocales) &&
        _options.availableLocales.length === 0)
      ) {
        throw new Error(`The availableLocales option is required when using the path option. See docs ${docsLink}`);
      }

      this.#options.path = _options.path;
      if (this.#options.lang !== this.#options.fallbackLang) {
        this.#loadLocale({ lang: this.#options.fallbackLang });
      }
      this.#loadLocale({ lang: this.#options.lang, cb: () => {
        this.#translate();
        this.#options.callback();
      }});
    } else {
      this.#translate();
      this.#options.callback();
    }

    this.#isInitialized = true;

    // Configure buttons which will switch languages.
    if (typeof _options.togglersSelector === "string") {
      if (_options.isTogglerSelect) {
        const selectEl = document.querySelector(_options.togglersSelector);
        if (!selectEl) throwInvalidSelector();

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

        if (!buttons.length) throwInvalidSelector();
        if (hasActiveClass) {
          for (const button of buttons.values()) {
            if (button.dataset.lang === this.#options.lang) {
              button.classList.add(_options.activeClass);
            }
          }
        }

        buttons.forEach((button) => {
          if (this.#options.availableLocales.includes(button.dataset.lang)) {
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
   * Sets the given language, applies the change and saves the language as the
   * current. If the given language is not available, the fallback language
   * will be used, and if it's not loaded, it will be loaded before applying
   * the change.
   * @param {string} lang the language to set.
   */
  setLocale(lang) {
    this.#loadLocale({ lang, cb: () => {
      this.#options.lang = lang;
      this.#translate();
      this.#options.callback();
    }});

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
   * Returns the texts object of the fallback language.
   * @returns {object} The fallback language texts object.
   * @private
   */
  #getFallbackObj() {
    return this.#options.locales[this.#options.fallbackLang];
  }

  /**
   * Fetches and returns as JSON the data from the given URL.
   * @param {string} url The URL to fetch.
   * @param {function(object=):void} [callback] The callback function to
   * execute when the data is fetched.
   */
  static async getJSON(url, callback) {
    fetch(url)
      .then((res) => res.json())
      .then((value) => {
        if (callback) callback(value);
      }).catch((err) => {
        console.error(err);
      });
  }

  /**
   * Loads the locale file of the given language.
   * @param {string} lang The language to load.
   * @param {function(object=):void} [cb] The callback to execute after
   * the locale is loaded.
   * @private
   */
  #loadLocale({ lang, cb }) {
    if (this.getLocales().includes(lang)) {
      if (typeof cb === "function") cb();
    } else {
      Si18n.getJSON(`${this.#options.path}/${lang}.json`, (locale) => {
        this.#options.locales[lang] = locale;
        if (typeof cb === "function") cb(locale);
      });
    }
  }

  /**
   * Translates the page content by setting/replacing values to/of the elements
   * with the `data-i18n` attribute and call the `translate` callback
   * method option.
   * @private
   */
  #translate() {
    let _rtl = false;
    if (!Si18n.#isUndefined(this.#options.locales[this.#options.lang]?.rtl))
      _rtl = this.#options.locales[this.#options.lang].rtl;

    document.documentElement.dir = _rtl ? "rtl" : "ltr";
    document.documentElement.lang = this.getLocale();

    // Auto translate using the given JSONPath in the data-si18n attribute.
    // When using this option, no need to write the script manually except
    // if you want use the string for other purposes
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

        // Supported attributes in which the text can be automatically set:
        // `title`, `label`, `aria-label`, `value`, `content`, and `placeholder`.

        if (!Si18n.#isUndefined(element.dataset.si18nTitle))
          element.setAttribute("title", text);

        if (!Si18n.#isUndefined(element.dataset.si18nLabel))
          element.setAttribute("label", text); // e.g: for <optgroup>

        if (!Si18n.#isUndefined(element.dataset.si18nAriaLabel))
          element.setAttribute("aria-label", text);

        if (!Si18n.#isUndefined(element.dataset.si18nValue))
          element.setAttribute("value", text); // e.g: for <input>, <option>, etc.

        if (!Si18n.#isUndefined(element.dataset.si18nContent))
          element.setAttribute("content", text); // e.g: for <meta>

        if (!Si18n.#isUndefined(element.dataset.si18nPlaceholder))
          element.setAttribute("placeholder", text); // e.g: for <input>
      });
    }

    this.#options.translate();
  }

  /**
   * Returns the translation string at the given key of the current language
   * or the fallback language if the key is not found in the current language.
   * @param {string} JSONPath the object property selector.
   * @param {object} [replacements] the object containing replacement values.
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
