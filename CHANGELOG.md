# si18n.js changelog

*Sorted from the most recent to the oldest*

> Before every upgrade, please read this changelog carefully to avoid any
> breaking changes and/or new features that you need to implement in your
> project.

## 1.4.4 (June 5, 2024)

- Add `alt` attribute support for auto translating using the `data-si18n-alt` attribute with value `true` in the element (e.g.: `<img>` tag).
- Fix: Skip elements with `data-si18n` attribute not set, instead of breaking the whole localization process.

## 1.4.3 (January 13, 2024)

- Fixed a bug where the name of the saved language (via `saveLang`, `saveAs`) would be corrupted on the user side and not available, causing the page to spit out.

## 1.4.2 (January 11, 2024)

- Fix fallback language selection logic. Before, when the `lang` option wasn't provided to the constructor, and there was no URL parameter, and the user hadn't yet selected/clicked (saved) a language, everything crashed. Now, the fallback language will be used in this case.
- Fix language selection logic about saved language.
- Slight performance improvement.
- Improve documentation and demo site.

## 1.4.1 (October 30, 2023)

- Ignore `data-si18n` attributes with no value.
- Functions (`translate` and `callback`) are excluded from the result of the
  `toJSON` method because they are not necessary.

## 1.4.0 (March 4, 2023)

- Add a `reloadPage` option to reload the page when the language is changed.
  `false` by default, this option may only be useful if the page structure is
  complex and need the translations to be loaded on language chang, simply.

## 1.3.2 (October 26, 2022)

- Fix a issue with the versioning of the package. The version juste replace the
  previous one (`1.3.1`). The previous version was named mistakenly as `1.3.1`
  and published while all commits was not created. The version `1.3.1` is not
  available on npm registry.

## 1.3.1 (October 25, 2022)

- doc: Update `getJSON` documentation.
- Fix the use of `getLocal` method regarding the `availableLocales` option.
  Now this method returns the value of `availableLocales` instead making
  `Object.keys(locales)`, wich doesn't give a correct result when `path`
  option is used.

## 1.3.0 (Octobre 19, 2022)

- Introduce CHANGELOG.
- feat: Allow automatic loading of the translations files using the new `path`
  and `availableLocales` options. **Now, just give a path and it's done!**
- feat: Improve errors triggers and robustness.
- The `translate` option is no longer required.
- The `onChange` option is renamed to `onLocaleChanged` for better clarity.
- Add [Crowdin](https://crowdin.com/) support to manage documentation
  translations with ease.
- doc: Remove the `select` demo from the demo page.
- doc: Updated the documentation.
- Fix some typos in the code documentation

## 1.2.0 (July 31, 2022)

- feat: Allow replacements in strings.
- Class name capitalized (`si18n` become `Si18n`) to match the class
  name standard.
- doc: Updated the documentation.

## 1.1.2 (July 14, 2022)

- feat: Automaticaly set the `lang` attribute to the `<html>` tag when setting
  or changing the language.
- doc: Accessibility on website improved.
- Add as public the full (non compressed) version of the module.

## 1.1.1 (June 30, 2022)

- doc: Documentation improved.
- The `instance.t` method was improved.

## 1.1.0 (June 29, 2022)

- feat: Introduce translation by HTML attributes (`data-si18n`,
  `data-si18n-default`, `data-si18n-html`, `data-si18n-title`,
  `data-si18n-label`, `data-si18n-value`).
- feat: Can now process chained patterns (e.g: `site.title`).
- feat: Can save the current language.
- feat: Can automatically set a language from the URL parameter (using the
  value of the `saveAs` option in the instance). Introduction `saveLang` and
  `saveAs` options).
- feat: The `lang` option is no longer required (if not set, browser language
  will be used).
- doc: Documentation completed and demo improved.
- Check required options for initialization.
- Add a `constructor` method.
- Add compressed version of the lib.

## 1.0.1 (June 18, 2022)

- Project renamed to "si18n.js".
- doc: Documentation and demo improved.
- Ignore some files in the package for NPM.

## 1.0.0 (June 9, 2022)

- First version of the project  with the lib and a basic documentation.
- The project was call "si18n".
- Published on NPM
