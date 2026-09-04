[![Netlify Status](https://api.netlify.com/api/v1/badges/8265ca9c-3d2f-434a-94b8-0b5f3ff7af45/deploy-status)](https://app.netlify.com/sites/si18n/deploys)
[![npm version](https://img.shields.io/npm/v/si18n.js)](https://www.npmjs.com/package/si18n.js)
[![wakatime](https://wakatime.com/badge/user/c7cc65f4-4921-4723-a014-551e8110a116/project/22c7a7a1-a930-4a2e-835e-e57f41fc3b1b.svg)](https://wakatime.com/badge/user/c7cc65f4-4921-4723-a014-551e8110a116/project/22c7a7a1-a930-4a2e-835e-e57f41fc3b1b)
[![Crowdin](https://badges.crowdin.net/si18njs/localized.svg)](https://crowdin.com/project/si18njs)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/si18n.js/badge)](https://www.jsdelivr.com/package/npm/si18n.js)

<div align="center">
  <h1>si18n.js</h1>
</div>

A simple and lightweight way to integrate internationalization on a small web site project.

The "s" in **si18n** stands for simple.

| Fast | Lightweight | No dependencies | Easy to use |
|:----:|:-----------:|:---------------:|:-----------:|
| Yes  | Yes         | Yes             | Yes         |

## Demo and Documentation

- Get started and read the docs on the [demo site](https://si18n.js.bruxelles.dev/)
- See releases on [GitHub](https://github.com/jdbruxelles/si18n.js/releases)
- See [changelog](CHANGELOG.md)

## Installation

### npm

```bash
npm i si18n.js
```

then use the browser-ready `Si18n` class:
```js
import Si18n from "si18n.js";
```

### yarn

```bash
yarn add si18n.js
```

### CDN

```html
<!-- jsDelivr (recommended) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/si18n.js@latest/si18n.js"></script>
<!-- minified -->
<script type="module" src="https://cdn.jsdelivr.net/npm/si18n.js@latest/si18n.min.js"></script>

<!-- UNPKG -->
<script type="module" src="https://unpkg.com/si18n.js@latest/si18n.js"></script>
<script type="module" src="https://unpkg.com/si18n.js@latest/si18n.min.js"></script>
```

### Node.js

```bash
npm i si18n.js
```

then use the dedicated Node.js export:
```js
const { Si18nNode: Si18n } = require("si18n.js/node");
```

### TypeScript

```bash
npm i si18n.js
```

then import the subpath that matches your runtime:
```ts
import Si18nBrowser from "si18n.js/browser";
import Si18nNode from "si18n.js/node";
import { Si18nCore } from "si18n.js/core";
```

### React (Client and Server)

```bash
npm i si18n.js react
```

Client-side provider and hook:
```tsx
"use client";

import Si18nBrowser from "si18n.js/browser";
import { Si18nProvider, useTranslation } from "si18n.js/react";

const i18n = new Si18nBrowser();

function Content() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <>
      <h1>{t("title")}</h1>
      <button onClick={() => void setLocale(locale === "en" ? "fr" : "en")}>Switch</button>
    </>
  );
}

export default function App() {
  return (
    <Si18nProvider
      i18n={i18n}
      options={{
        locales: {
          en: { title: "Hello" },
          fr: { title: "Bonjour" }
        },
        lang: "en",
        fallbackLang: "en"
      }}
    >
      <Content />
    </Si18nProvider>
  );
}
```

Server-side helper:
```ts
import { createServerTranslator } from "si18n.js/react/server";

const { t } = await createServerTranslator({
  locales: {
    en: { title: "Hello" },
    fr: { title: "Bonjour" }
  },
  lang: "en",
  fallbackLang: "en"
});

console.log(t("title"));
```

> [!NOTE]
> For detailed usage information, demos, and the full API reference, [visit the docs](https://si18n.js.bruxelles.dev).

## Run locally

The following instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Requirements

- [Node.js](https://nodejs.org/en/download/)
- [Git](https://git-scm.com/downloads)

### Clone the repo

```bash
git clone git@github.com:jdbruxelles/si18n.js.git
```

### Install the dependencies

```bash
npm install
```

### Build Commands

- Run the build process
```bash
npm run build
```

- Run tests
```bash
npm test
```

- Watch files during development
```bash
npm run watch
```

<!--
### npm Publishing

To publish a new version, simply update the version in `package.json` and run:
```bash
npm publish
```

*Note: The `npm publish` command will automatically run `npm run build && npm test` to ensure everything is correct before creating the package.*
-->

### Server

For the server, you can use any server you want, but I recommend using [http-server](https://www.npmjs.com/package/http-server). It's a simple zero-configuration command-line http server. I personally use the python `http.server` or the server provided by [netlify-cli](https://www.npmjs.com/package/netlify-cli) to work locally.

## Contributing

Contributions are always welcome! For major changes, please [open an issue](https://github.com/jdbruxelles/si18n.js/issues/new) first to discuss what you would like to change.

## Translation

You can help translate the application by using [Crowdin](https://crwd.in/si18njs).

All translations are stored in the `website/locales` directory. Under no circumstances should you edit the files in this directory, except for the `fr.json` file which is the source language for the translations.

Translations will be available on the app if they exceed a certain threshold of completion (currently 90%).

## Licence

[MIT License](LICENSE)
