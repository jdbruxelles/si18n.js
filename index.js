/**
 * Make translation management easier and more efficient.
 * @author José dBruxelles <jd.bruxelles.dev/c>
 */
export default class i18n {
  #noop() {} // Empty function to avoid undefined paramaters.
  #isInitialized = false;
  #options = {
    lang: "", // do not define the lang option if you want to use a language detector.
    fallbackLang: "",
    locales: {},
    activeClass: "",
    togglersSelector: "",
    isTogglerSelect: false,
    translate: this.#noop,
    callback: this.#noop
  };

  /**
   * Initializes the i18n object.
   * @param {object} _options Options to initialize the i18n object.
   * @param {object} _options.locales Object containing local translations.
   * @param {string} [_options.lang] Active language.
   * @param {string} _options.fallbackLang Fallback language.
   * @param {string} [_options.activeClass] Class to apply to the active language.
   * @param {string} _options.togglersSelector Selector to the togglers elements.
   * @param {boolean} [_options.isTogglerSelect=false] Whether the toggler is a select or a button.
   * @param {function} _options.translate Function that translate the text manually.
   * @param {function} [_options.onChange] Function that handle after each language change.
   * @returns {i18n} The i18n object.
   */
  init(_options = {}) {
    if (this.#isInitialized) return; // Initialize once.
    if (_options.locales) this.#options.locales = _options.locales;
    if (typeof _options.onChange === "function") {
      this.#options.callback = _options.onChange;
    }

    if (_options.lang) {
      this.#options.lang = _options.lang;
    } else {
      // Use the default language of the navigator.
      this.#options.lang = navigator.language.substring(0, 2);
    }

    if (_options.fallbackLang) this.#options.fallbackLang = _options.fallbackLang;
    if (_options.translate) this.#options.translate = _options.translate;

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
   * Sets the given language as the current and call
   * the translate method to make the translation.
   * @param {string} lang the language to set.
   */
  #translate(lang) {
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
    if (typeof value === "undefined") {
      // Use the fallback language when the selected is not available.
      value = this.#options.locales[this.#options.fallbackLang];
    }
    return value[JSONPath];
  }

  /**
   * Returns the options of the i18n object.
   * @returns {object} The options of the i18n object.
   */
  toJSON() {
    return this.#options;
  }
}
