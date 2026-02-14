# Changelog

## 1.0.2

### Patch Changes

- [#38](https://github.com/walterra/node-es-transformer/pull/38) [`9927e4e`](https://github.com/walterra/node-es-transformer/commit/9927e4eb6975e663c00cc87e57e204970829558b) - Use GitHub App token for release PRs and restore automatic GitHub and npm publishing after merge

## 1.0.1

### Patch Changes

- [#36](https://github.com/walterra/node-es-transformer/pull/36) [`0865586`](https://github.com/walterra/node-es-transformer/commit/08655868bd001c01da949be2800d6c2117171286) - Fix publish workflow to build package before creating tarball

## 1.0.0

### Major Changes

- [#27](https://github.com/walterra/node-es-transformer/pull/27) [`812d9ba`](https://github.com/walterra/node-es-transformer/commit/812d9bae067007fd15ebdbc921827e419408b077) - Update to Node.js 22, migrate to Changesets, and add automated npm publishing (breaking: requires Node 22+)

- [#31](https://github.com/walterra/node-es-transformer/pull/31) [`99a1c80`](https://github.com/walterra/node-es-transformer/commit/99a1c808f396e4e552acdc1f65d2772df7519a9b) - Improved documentation, TypeScript support.

### Minor Changes

- [#31](https://github.com/walterra/node-es-transformer/pull/31) [`99a1c80`](https://github.com/walterra/node-es-transformer/commit/99a1c808f396e4e552acdc1f65d2772df7519a9b) - Add cross-version reindex support for ES 8.x to 9.x migration with dual client aliasing

### Patch Changes

- [#34](https://github.com/walterra/node-es-transformer/pull/34) [`3a0d7cd`](https://github.com/walterra/node-es-transformer/commit/3a0d7cd2e147ea9517f10eb07a0e9f7fe78fb2e7) - Upgrade glob from v7 to v13

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.0.0-beta7](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta6...v1.0.0-beta7) (2024-12-31)

## [1.0.0-beta6](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta5...v1.0.0-beta6) (2024-12-31)

## [1.0.0-beta5](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta4...v1.0.0-beta5) (2024-12-31)

### ⚠ BREAKING CHANGES

- Minimum required nodejs version: v20

- update .nvmrc to v20 ([e77899a](https://github.com/walterra/node-es-transformer/commit/e77899a398703fd2d0ffaeb093a3b7a1d638cc6f))

### Features

- emits docsPerSecond event ([bc825fe](https://github.com/walterra/node-es-transformer/commit/bc825fee18cbe2eaafc2f7d67f34067e0b93db50))
- support for pipeline ([c53ea2c](https://github.com/walterra/node-es-transformer/commit/c53ea2c5465b564ec141ab2abfe7e0db6cac1fb0))

## [1.0.0-beta4](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta3...v1.0.0-beta4) (2024-12-30)

### Docs

- updated README.md to document `stream` option (bc664fe).

### Chore

- add tests for `stream` option (b5b644c).
- update ES client to `8.17.0` (62edd5c).

## [1.0.0-beta3](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta2...v1.0.0-beta3) (2024-12-23)

### ⚠ BREAKING CHANGES

- bufferSize is no longer number of docs but flush KBytes.

### Features

- delete index option ([b92bd21](https://github.com/walterra/node-es-transformer/commit/b92bd211ace2eb66aedb06f58ba64e8c23f94aaa))
- adds support for node stream as source ([281950c](https://github.com/walterra/node-es-transformer/commit/281950c12f20a9526f3d1db75ed23cec5255cba4))
- make use of ES client bulk index helper ([b0b39c8](https://github.com/walterra/node-es-transformer/commit/b0b39c8fe95758cc52f8c82caa7ac4bde2cd87a1))

## [1.0.0-beta2](https://github.com/walterra/node-es-transformer/compare/v1.0.0-beta1...v1.0.0-beta2) (2023-11-08)

### Features

- new `populatedFields` option ([abc9a06](https://github.com/walterra/node-es-transformer/commit/abc9a06ee0aade79fd5e4acf93371e7213790cde))

### Bug Fixes

- fix line handling for transform callback for file reader ([9962382](https://github.com/walterra/node-es-transformer/commit/99623824ef80fff2956bf9b90164395f8854ebe3))

## [1.0.0-beta1](https://github.com/walterra/node-es-transformer/compare/v1.0.0-alpha12...v1.0.0-beta1) (2023-10-30)

### Bug Fixes

- avoid passing on an empty buffer in finish callback ([e0fbe8e](https://github.com/walterra/node-es-transformer/commit/e0fbe8e47a876af2d601fbe74521e46dbc0dc750))
- fix event handling for file-reader ([5f472b3](https://github.com/walterra/node-es-transformer/commit/5f472b37f647bb0320653f8333ccec984483c12f))
- fixes parallel calls ([9c2785d](https://github.com/walterra/node-es-transformer/commit/9c2785d592ff5ee825799f4fe0a0dbaed54ddd15))
- trigger end of progress bar only after finish event was triggered ([e57b9a0](https://github.com/walterra/node-es-transformer/commit/e57b9a0954c8e98cc8b724ba9dca546e1f443d59))

## [1.0.0-alpha12](https://github.com/walterra/node-es-transformer/compare/v1.0.0-alpha11...v1.0.0-alpha12) (2023-10-12)

### Features

- bulk ingest with parallel calls and dynamic backoff ([0c7311d](https://github.com/walterra/node-es-transformer/commit/0c7311daf19b0da1a59a8698a9dd9b240ca20c21))

## [1.0.0-alpha11](https://github.com/walterra/node-es-transformer/compare/v1.0.0-alpha10...v1.0.0-alpha11) (2023-10-12)

### Features

- new option 'indexMappingTotalFieldsLimit' ([92edad1](https://github.com/walterra/node-es-transformer/commit/92edad18da7186d3881fc181e6e88b7929bed2d4))

### Bug Fixes

- fixes bufferSize to be applied to index reader too ([ffc3749](https://github.com/walterra/node-es-transformer/commit/ffc3749e296cd39f39924571c197986addc756ff))

## [`v1.0.0-alpha10`](https://github.com/walterra/node-es-transformer/releases/tag/v1.0.0-alpha10)

- New option `mappingsOverride` (0b951e1).
- New option `query` (45f91db).

## [`v1.0.0-alpha9`](https://github.com/walterra/node-es-transformer/releases/tag/v1.0.0-alpha9)

- Source and target configs are now expected to be passed in as complete client configs instead of individual parameters (5e6d0c7).

## [`v1.0.0-alpha8`](https://github.com/walterra/node-es-transformer/releases/tag/v1.0.0-alpha8)

- Exposes events and introduces `finish` event (a3e5810).
- Drop support for `_type` from `6.x` indices (3a26a84).

## [`v1.0.0-alpha7`](https://github.com/walterra/node-es-transformer/releases/tag/v1.0.0-alpha7)

- This version locks down `event-stream` to version `3.3.4` because of the security issue described here: https://github.com/dominictarr/event-stream/issues/116
- Last version to support `_type` from `6.x` indices.
