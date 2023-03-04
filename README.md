[![Netlify Status](https://api.netlify.com/api/v1/badges/8265ca9c-3d2f-434a-94b8-0b5f3ff7af45/deploy-status)](https://app.netlify.com/sites/si18n/deploys)
[![wakatime](https://wakatime.com/badge/user/c7cc65f4-4921-4723-a014-551e8110a116/project/7b08fe76-98cb-44e3-bcab-294aad0fda0a.svg)](https://wakatime.com/badge/user/c7cc65f4-4921-4723-a014-551e8110a116/project/7b08fe76-98cb-44e3-bcab-294aad0fda0a)
[![Crowdin](https://badges.crowdin.net/si18njs/localized.svg)](https://crowdin.com/project/si18njs)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/si18n.js/badge)](https://www.jsdelivr.com/package/npm/si18n.js)

<div align="center">
  <h1>si18n.js</h1>
</div>

This project is a simple package to integrate internationalization on a small
web site project.

The "s" in **si18n** stands for simple.

| Fast | Lightweight | No dependencies | Easy to use |
|:----:|:-----------:|:---------------:|:-----------:|
| Yes  | Yes         | Yes             | Yes         |

## Demo and Documentation

You can :
- get started on the [demo site](https://si18n.js.bruxelles.dev/),
- See releases on [GitHub](https://github.com/jdbruxelles/si18n.js/releases),
- and see [changelog](CHANGELOG.md).

## Installation

### npm

Installation using [npm](https://www.npmjs.com/package/si18n.js)...
```bash
npm i si18n.js
```

then use the `si18n` class:
```js
import si18n from "si18n.js";
```

### yarn

```bash
yarn add si18n.js
```

### CDN

```html
<script type="module" src="https://unpkg.com/si18n.js"></script>
<!-- or -->
<script type="module" src="https://unpkg.com/si18n.min.js"></script>
```

## Usage

For detailed usage information,
[visit the docs](https://si18n.js.bruxelles.dev).

## Run locally

The following instructions will get you a copy of the project up and running
on your local machine for development and testing purposes.

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

### Gulp Tasks

- The default build task (run once)
```bash
gulp
```

- Automatically rerun the build task when a script file changes
```bash
gulp watch
```

### Server

For the server, you can use any server you want, but I recommend using
[http-server](https://www.npmjs.com/package/http-server). It's a simple
zero-configuration command-line http server. I personally use the server
provided by [netlify-cli](https://www.npmjs.com/package/netlify-cli) to work
locally.

## Contributing

Contributions are always welcome! For major changes, please
[open an issue](https://github.com/jdbruxelles/si18n/issues/new) first to
discuss what you would like to change.

## Traduction

You can help translate the application by using [Crowdin](https://crwd.in/si18njs).

All translations are stored in the `/locales` directory. Under no circumstances
should you edit the files in this directory, except for the `index.js` and
`fr.json` files which are the source language for the translations.

Translations will be available on the app if they exceed a certain threshold
of completion (currently 90%).

## Licence

[MIT License](LICENSE)
