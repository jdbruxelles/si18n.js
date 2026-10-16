# GitHub Actions Workflows

This directory contains the continuous integration (CI) and automated release workflows for `si18n.js`.

---

## Workflows Overview

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| **CI** | [`ci.yml`](./ci.yml) | Push and PR to `main` | Builds, typechecks, runs all test suites on Node 20.x & 22.x, and verifies tarball contents via `npm run pack:check`. |
| **Publish to npm** | [`publish.yml`](./publish.yml) | GitHub Release published (`release: [published]`) or `workflow_dispatch` | Audits dependencies, verifies release tag parity, runs full test suite, verifies tarball, and publishes to npm with cryptographic SLSA provenance. |

---

## Security & Permissions

All workflows enforce **least-privilege permissions**:

- **CI (`ci.yml`)**:
  ```yaml
  permissions:
    contents: read
  ```
- **Publish (`publish.yml`)**:
  ```yaml
  permissions:
    contents: read
    id-token: write # Required for npm OIDC SLSA build provenance attestation
  ```

---

## npm Publishing Process

### 1. Prerequisites (Setup on npm)

To publish via GitHub Actions with cryptographic provenance, choose one of the following authentication methods:

#### Option A: npm Trusted Publishing (Recommended)
1. Go to [npmjs.com](https://www.npmjs.com) and navigate to the `si18n.js` package settings.
2. Select **Publishing access** > **Add a publisher**.
3. Choose **GitHub Actions**:
   - Organization / Owner: `jdbruxelles`
   - Repository: `si18n.js`
   - Workflow filename: `publish.yml`
4. With Trusted Publishing, no static token secrets are required; npm authenticates GitHub Actions via short-lived OIDC tokens.

#### Option B: Repository Secret (`NPM_TOKEN`)
1. Create a granular automation access token on [npmjs.com](https://www.npmjs.com).
2. Add it to GitHub repository settings: **Settings** > **Secrets and variables** > **Actions** > **Repository secrets** named `NPM_TOKEN`.

---

### 2. Standard Release Procedure

1. **Update package version and changelog**:
   - Update `"version"` in [`package.json`](../../package.json).
   - Document changes in [`CHANGELOG.md`](../../CHANGELOG.md).
2. **Verify locally**:
   ```bash
   npm test
   npm run pack:check
   ```
   `pack:check` performs an `npm pack --dry-run` to ensure only intended artifacts (`dist/**`, browser standalone files, and metadata) are included.
3. **Commit and push**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "Release vX.Y.Z"
   git push origin main
   ```
4. **Create a GitHub Release**:
   - Go to **Releases** > **Draft a new release**.
   - Create a tag matching the version (e.g., `v2.0.0` or `2.0.0`).
   - Title and publish the release.

The `publish.yml` workflow will automatically trigger, verify that the release tag matches `package.json`, and publish to npm with SLSA provenance.

---

### 3. Emergency / Local Publishing

If you ever need to publish manually from a local machine:

```bash
# 1. Run checks
npm test
npm run pack:check

# 2. Publish (note: omit --provenance locally as provenance requires CI OIDC)
npm publish --access public
```
