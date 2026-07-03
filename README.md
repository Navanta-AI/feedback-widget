# @navanta/feedback-widget

Figma-style pinned feedback for websites — click any element, drop a DOM-anchored
comment, and resolve it when done. Shadow-DOM isolated, framework-agnostic, with
a React hook.

**Source fork of [SitePing](https://github.com/NeosiaNexus/SitePing) (MIT)** by
NeosiaNexus. `@siteping/core` is vendored into `src/_core` so this package is
self-contained. See `LICENSE` (retains the original copyright).

## Install

```bash
npm install @navanta/feedback-widget
```

## React / Next.js (client-side store, no backend)

```tsx
"use client";
import { useSiteping } from "@navanta/feedback-widget/react";
import { LocalStorageStore } from "@navanta/feedback-widget/adapter-localstorage";

export function Feedback() {
  useSiteping({
    store: new LocalStorageStore(),
    projectName: "my-app",
    position: "bottom-right",
    forceShow: true,
  });
  return null;
}
```

For a shared/online store, pass `endpoint: "/api/feedback"` instead of `store`
and back it with a server adapter.

## Build

```bash
npm install
npm run build   # tsup → dist/ (ESM + IIFE + React entry + types)
```

## Exports

| Path | What |
|---|---|
| `.` | `initSiteping`, core widget API |
| `./react` | `useSiteping` hook (React ≥18, external peer) |
| `./adapter-localstorage` | `LocalStorageStore` (no backend) |

## Credits

Built on **SitePing** by NeosiaNexus — https://siteping.dev · MIT.
