# Percy CLI

![CI](https://github.com/wwilsman/percy/workflows/Continuous%20Integration/badge.svg)

The Percy CLI is used to capture and upload snapshots to [percy.io](https://percy.io) from the
command line.

## Installation

Using yarn: 

```sh-session
$ yarn add @percy/cli --dev
```

Using npm: 

```sh-session
$ npm install @percy/cli --save-dev
```

## Command Topics

- [`percy exec`](./packages/cli-exec#readme) - capture and upload snapshots
- [`percy snapshot`](./packages/cli-snapshot#readme) - snapshot a static directory or a list of pages
- [`percy upload`](./packages/cli-upload#readme) - upload a static directory of images
- [`percy config`](./packages/cli-config#readme) - manage configuration files
- [`percy finalize`](./packages/cli-finalize#readme) - finalize parallel builds

### Advanced

In addition to the CLI packages, this repo contains core libraries responsible for Percy's CI/CD
integrations, Percy API communication, DOM snapshotting, and asset discovery.

- [`@percy/core`](./packages/core#readme) - performs snapshot asset discovery and uploading
- [`@percy/config`](./packages/config#readme) - loads Percy configuration files
- [`@percy/dom`](./packages/dom#readme) - serializes DOM snapshots
- [`@percy/env`](./packages/env#readme) - captures CI build environment variables
- [`@percy/client`](./packages/client#readme) - handles communicating with the Percy API
- [`@percy/logger`](./packages/logger#readme) - common logger used throughout the CLI

## Issues

For problems directly related to the CLI, [add an issue on
GitHub](https://github.com/percy/percy-cli/issues/new).

For other issues, [open a support request](https://percy.io).

## Developing

This project is built with [lerna](https://lerna.js.org/). The core libaries and CLI plugins are
located in [./packages](./packages). Run `yarn` to install dependencies after cloning the repo and use
the following scripts for various development tasks:

- `yarn build` - build all packages
- `yarn build:watch` - build and watch all packages in parallel
- `yarn clean` - clean up build and coverage output
- `yarn lint` - lint all packages
- `yarn readme` - generate oclif readme usage
- `yarn test` - run all tests, one package after another
- `yarn test:coverage` - run all tests with coverage, one package after another

Individual package scripts can be invoked using yarn's
[workspace](https://classic.yarnpkg.com/en/docs/cli/workspace/) command. For example:

```sh-session
$ yarn workspace @percy/core test
```

## Releasing

**@todo**