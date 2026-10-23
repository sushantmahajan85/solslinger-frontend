# Solslinger Studio — Frontend

Next.js (App Router) client for Solslinger Studio, built to the *Cinematic Frontier Noir* UI/UX specification.
It talks only to the separate Express + MongoDB API in [`solslinger-backend`](../solslinger-backend).

## Journey

| Route | Screen | Shown when |
| --- | --- | --- |
| `/` | Landing shell: logo, age gate, Solana wallet connect + sign-in | Always |
| `/onboarding` | PixiJS train arrival (lazy-loaded) | Passport has no `onboardingCompletedAt` |
| `/faction` | Faction selection + permanent-allegiance confirmation | No faction yet |
| `/character` | Character grid + Bounty Dossier | Faction chosen, no character yet |
| `/lobby` | The Bloody Raven saloon with three stations | Passport complete |

Every screen is guarded by the profile's `nextStep` returned by the API, so the train never replays for
returning users and screens can't be reached out of order.

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit values
npm run dev                  # http://localhost:3000
```

Start the backend first (`npm run dev:memory` in `solslinger-backend` needs no MongoDB install).

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Express API, e.g. `http://localhost:4000` |
| `NEXT_PUBLIC_ENABLE_DEV_WALLET` | `true` adds an in-browser **Burner Wallet** so the flow can be tested without an extension. Keep `false` in production. |
| `NEXT_PUBLIC_LOBBY_MUSIC_URL` | Optional. A licensed audio file to loop in the lobby instead of the built-in score. |

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` / `typecheck` | ESLint and TypeScript checks |
| `npm run assets` | Regenerates `public/brand` and `public/scene` from the original artwork in `assets-source/` |

## Structure

```
src/
  app/                 routes (thin server components) + globals.css design tokens
  components/
    ui/                Button, IconButton, Checkbox, TextInput, Dialog, Toast, Spinner,
                       StatusIndicator, SectionHeading, StatePanel, Icons
    wallet/            providers, custom wallet picker, connected-wallet chip
    landing/           landing shell + age gate
    onboarding/        train scene (PixiJS) + overlay
    faction/           faction cards + allegiance flow
    character/         portrait grid + Bounty Dossier
    lobby/             Bloody Raven stage, station nodes, profile badge
    layout/            shared journey frame for faction/character screens
  lib/                 API client, session/passport state, types, hooks
public/
  brand/, scene/       web-optimised copies of the supplied artwork (served by the app)
assets-source/         the original, unmodified production artwork (logo, saloon, hostess, train, slot cabinets)
```

The app only needs `public/` to run and deploy. `assets-source/` keeps the full-size originals in the repo so the
web versions can always be regenerated with `npm run assets`; it is not served or bundled.

## Design system

All colour, type, spacing, radius and motion values live as CSS custom properties in
`src/app/globals.css`. Faction theming is applied with `data-faction="outlaws" | "vance" | "gamblers"`,
which remaps `--faction-primary`, `--faction-secondary`, `--faction-deep` and `--faction-glow`.

* **Type:** Cinzel (display) + Inter (interface) via `next/font` — self-hosted at build time.
* **Status colours** (`--danger`, `--success`) use hues distinct from the Outlaws crimson and Gamblers emerald,
  and are always paired with an icon and text.
* **Motion:** 150–250 ms UI transitions; everything respects `prefers-reduced-motion`.

## Implementation notes

* **Wallet sign-in:** Wallet Standard wallets (Phantom, Solflare, Backpack, …) are detected automatically.
  The user signs a one-time message (no transaction, no fees); the API verifies the ed25519 signature and
  returns a session token.
* **Train onboarding:** `trainScene.ts` is imported dynamically, so PixiJS and the train texture load only
  for visitors who still need the arrival. Layers: dusk sky, parallax ridges, telegraph poles, dust, steam,
  headlamp glow, slow push-in. Reduced motion renders one still frame; if WebGL is unavailable a static
  composition is shown instead. All Pixi resources are destroyed on unmount.
* **Lobby:** a pure-CSS cover-fit 16:9 stage (no transform scaling) with `filter: blur(4px)` on the
  background layer only. The art box overhangs the stage by 12px so the blur's soft edge is never visible.
  Hostess and slot-cabinet sprites stay sharp. Station positions are percentages of the artwork
  (`lobbyNodes.ts`); each opens a themed *Coming soon* notification.
* **Lobby music:** "The Bloody Raven Rag" is an original stride-piano piece written for this project and
  synthesised live with the Web Audio API (`components/lobby/audio/saloonMusic.ts`) — no samples or
  third-party recordings, so there is nothing to license. It starts when the browser allows audio (otherwise on
  the first click or key press), fades out while the tab is hidden, and the HUD toggle or the **M** key mutes it;
  the choice is remembered per device.
* **Slot cabinets:** the supplied JPEGs are on solid black; `npm run assets` removes only the black backdrop
  connected to the image border (colours untouched) so they can stand in the left corridor.
* **Character data** (names, lore, portraits) always comes from the API — nothing is hardcoded here.
