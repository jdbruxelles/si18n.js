# si18n.js changelog

*Sorted from the most recent to the oldest*

> Before every upgrade, please read this changelog carefully to avoid any
> breaking changes and/or new features that you need to implement in your
> project.

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