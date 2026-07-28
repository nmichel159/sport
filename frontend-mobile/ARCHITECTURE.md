# Mobile frontend architecture

The Expo Router files in `app/` only define routes. Application code lives in
`src/` and is grouped by responsibility:

- `src/providers/` composes providers shared by every route. Do not create a
  `src/app/` directory: Expo Router would treat it as the route root.
- `src/system/` owns global runtime system-UI policy.
- `src/features/<feature>/screens/` contains complete app screens.
- `src/features/<feature>/components/` contains feature-only UI pieces.
- `src/features/<feature>/hooks/` contains state and side-effect logic.
- `src/features/<feature>/services/` contains network or persistence calls.
- `src/components/` contains UI shared by multiple features.
- `src/styles/` contains the existing visual properties grouped by purpose.
- `src/types/`, `src/constants/`, and `src/utils/` contain shared primitives.

## Android system UI

The Android navigation bar must stay hidden for the full lifetime of the app.
The policy is intentionally isolated in three matching layers:

1. `app.json` defines Expo build defaults.
2. `src/system/SystemUiController.tsx` reapplies the policy after app-state,
   modal, and visibility changes.
3. `android/.../system/SystemUi.kt` enforces the same policy on activity
   creation, focus, and resume.

Any change to this policy must keep all three layers aligned and requires a new
native Android build.

## Refactoring rule

Screen behavior, API paths, form validation, messages, delays, styles, and
component props must be moved before they are changed. Run `npm run typecheck`
and `npm run bundle:android` after structural changes.
