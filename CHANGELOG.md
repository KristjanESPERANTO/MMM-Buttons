# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.1.1](https://github.com/jopyth/MMM-Buttons/compare/v2.1.0...v2.1.1) (2026-03-09)


### Bug Fixes

* add libgpiod v1.x compatibility ([1134374](https://github.com/jopyth/MMM-Buttons/commit/11343744a84c96b2457a656c02c49cc837049188)), closes [#1](https://github.com/jopyth/MMM-Buttons/issues/1)
* replace `which gpiomon` with `command -v gpiomon` ([fdef03e](https://github.com/jopyth/MMM-Buttons/commit/fdef03e8a41b00402ae7782bb7b8e8db19895a9c)), closes [#2](https://github.com/jopyth/MMM-Buttons/issues/2)


### Maintenance

* add lint-staged and simple-git-hooks for pre-commit linting ([e11cbbe](https://github.com/jopyth/MMM-Buttons/commit/e11cbbe18a1631a320f95e73e4635142b856bb49))
* add missing devDependency @eslint/js ([c2304ba](https://github.com/jopyth/MMM-Buttons/commit/c2304bae66b4747e2526da2820d95083f08a97b8))
* add type + correct homepage and contributors format ([22ee792](https://github.com/jopyth/MMM-Buttons/commit/22ee7925ecf7c5fd38565db8a256e17a541ec76b))
* rename logo image to get it into the module list ([627adbd](https://github.com/jopyth/MMM-Buttons/commit/627adbdfb0c85353c644a7b673bdf6269b3315eb))
* update devDependencies ([c19d1b1](https://github.com/jopyth/MMM-Buttons/commit/c19d1b1fe6ae50767613ffa1f0914a66cb4a43d6))
* update ESLint config ([ff4765a](https://github.com/jopyth/MMM-Buttons/commit/ff4765a84a81ba1539c5de914422ae1982fed7dc))
* update keywords in package.json ([e53fbb1](https://github.com/jopyth/MMM-Buttons/commit/e53fbb1eec6667a6fad635f0bef3fc09efc70269))


### Documentation

* reorganize installation instructions ([b7aa52e](https://github.com/jopyth/MMM-Buttons/commit/b7aa52e7d429e4e4fe707333efbb34a9a714daa8))

## [2.1.0](https://github.com/jopyth/MMM-Buttons/compare/v2.0.0...v2.1.0) (2025-12-14)


### Features

* add debug logging for button press/release events and gpiomon output ([46c348b](https://github.com/jopyth/MMM-Buttons/commit/46c348bde166508f6073c67659edf605ef1a58ba))
* add optional frontend debug view ([3c3df12](https://github.com/jopyth/MMM-Buttons/commit/3c3df126d539b4721aa3f2e9e61e5df15e25557b))
* configure GPIO bias (pull-up/pull-down) automatically ([908174b](https://github.com/jopyth/MMM-Buttons/commit/908174bd85afdd15471cdabb12714f3943c6a5db))


### Bug Fixes

* access longPress array correctly for alert display ([69003ec](https://github.com/jopyth/MMM-Buttons/commit/69003ecfd464d1a3e6133e4c01d7ee47cbb517e7))
* increase maxShortPressTime default from 500ms to 1000ms ([3d7f047](https://github.com/jopyth/MMM-Buttons/commit/3d7f0471ad48fc1af01598cc043457239f88f3ad))


### Maintenance

* add commit-and-tag-version for automated releases ([3a2e73e](https://github.com/jopyth/MMM-Buttons/commit/3a2e73ea1ea367bbf401faf4782f51951f1bb979))
* add ESLint config and modernize codebase ([ebe85c9](https://github.com/jopyth/MMM-Buttons/commit/ebe85c94eef65a54a396404b33aec8e77d5276a1))
* add spellcheck and fix typos ([7124b66](https://github.com/jopyth/MMM-Buttons/commit/7124b6612d30fb00c178b1b9abb41cf7705342d8))
* change Dependabot update interval from weekly to monthly ([2f75a10](https://github.com/jopyth/MMM-Buttons/commit/2f75a10a1251014598e5de77ab0879a41a59755e))


### Documentation

* add Code of Conduct ([4f602e1](https://github.com/jopyth/MMM-Buttons/commit/4f602e1cdc2161ec4ca0f86e364ffe6ccd497c61))
* add screenshots and optimize config example ([bec1002](https://github.com/jopyth/MMM-Buttons/commit/bec10024b9dd82e2564a4d2b138f17b713f3d0b3))
* add update instructions to README ([366a815](https://github.com/jopyth/MMM-Buttons/commit/366a8153237d1ad3391305a2e9ac90fd3d6d28b2))
- update repository URL in installation instructions ([d7e6e99](https://github.com/jopyth/MMM-Buttons/commit/d7e6e9914965030b7631b7df91ee777962131551))

### Code Refactoring

* fix ESLint errors in MMM-Buttons.js ([33d15a2](https://github.com/jopyth/MMM-Buttons/commit/33d15a289c10f77f2b452fdf0a3d4a74317a0025))
* simplify frontend defaults ([726954c](https://github.com/jopyth/MMM-Buttons/commit/726954c9e8051ca8f25b4178844d7f9c1b1b8664))
* use hardware debouncing via gpiomon instead of software debounce ([e2e38b2](https://github.com/jopyth/MMM-Buttons/commit/e2e38b230fb8a70e411103935207f61c4c8c5e85))


## 2.0.0 (2025-12-13)

### ⚠ BREAKING CHANGES

* This module now uses gpiod tools instead of npm dependencies. On Raspberry Pi OS, gpiod is usually pre-installed. If not, run `sudo apt install gpiod`. No more `npm install` or electron-rebuild required.

### Code Refactoring

* replace native onoff module with gpiod CLI tools ([954177e](https://github.com/jopyth/MMM-Buttons/commit/954177edd642325824b2dd4d8079e8302d3a28f6))
  * Remove onoff, nan, and @electron/rebuild dependencies
  * Use gpiomon child process for GPIO event monitoring
  * Add platform detection (Linux only, graceful skip on Windows/Mac)
  * Add gpiod availability check at startup with clear error messages
  * Simplify RPi5 support using gpiochip4 instead of pin offset hack
  * Add proper cleanup of gpiomon processes on module stop
  * Update README with new installation instructions


## Previous Changes

See git history for previous changes.
