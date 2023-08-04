## [`main`](https://github.com/walterra/node-es-transformer/tree/main)

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
