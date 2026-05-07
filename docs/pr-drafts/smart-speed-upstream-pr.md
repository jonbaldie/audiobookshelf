# Smart Speed upstream PR draft

## Proposed title

Add Smart Speed playback for silence compression

## Proposed branch

`feat/smart-speed-playback`

## PR body draft

## Brief summary

Add Smart Speed for local web playback so silent sections longer than 200ms can be played faster without changing normal speech playback.

## Which issue is fixed?

Upstream issue not filed yet. Manager review should decide whether to open an upstream feature request before submission.

## In-depth Description

This change adds an optional Smart Speed mode to the local audio player. When enabled, the player uses a Web Audio `AudioWorkletNode` to detect silence and temporarily raises `playbackRate` during those silent spans. Spoken audio continues at the listener's selected playback speed.

The implementation keeps player progress, seeking, and bookmark/session updates in a single wall-clock time domain even while the underlying audio element advances faster through silence. That avoids the user-visible drift that would otherwise happen if UI progress and saved positions were based on compressed media time.

The feature is scoped to `LocalAudioPlayer`. Cast playback is unchanged. Browsers without the needed Web Audio support fall back gracefully by leaving Smart Speed inactive.

UI changes include:

- a player setting to enable Smart Speed
- a compression ratio selector
- a playback indicator when Smart Speed is active

## How have you tested this?

- From `client/`: `npm test -- --spec "cypress/tests/players/SmartSpeedE2E.cy.js,cypress/tests/players/LocalAudioPlayer.cy.js"`
- Result: PASS in 11.55s wall time (`/usr/bin/time -p`; Cypress reported 3 passing tests across 2 specs, with no failures, pending tests, skipped tests, screenshots, or video)
- Transcript summary:

```text
> audiobookshelf-client@2.34.0 test
> npm run compile-tailwind && cypress run --component --browser chrome --spec cypress/tests/players/SmartSpeedE2E.cy.js,cypress/tests/players/LocalAudioPlayer.cy.js

> audiobookshelf-client@2.34.0 compile-tailwind
> npx @tailwindcss/cli -i ./assets/tailwind.css -o ./cypress/support/tailwind.compiled.css

≈ tailwindcss v4.0.14
Done in 78ms

Running: SmartSpeedE2E.cy.js (1 of 2)
  Smart Speed E2E with Real Audio
    ✓ compresses silence with real audio and real Web Audio API (1188ms)
  1 passing (1s)

Running: LocalAudioPlayer.cy.js (2 of 2)
  LocalAudioPlayer
    ✓ increases playbackRate during silence (19ms)
    ✓ maps currentTime, duration, and seek through the same Smart Speed wall-clock contract (6ms)
  2 passing (34ms)

All specs passed: 3 passing, 0 failing, 0 pending, 0 skipped
real 11.55
user 4.18
sys 0.90
```

- Notable warnings during the clean run:
  - Nuxt warned to use `build.postcss` in `nuxt.config.js` instead of an external PostCSS config file.
  - Cypress/Chrome printed `Opening /dev/tty failed (6): Device not configured` in the non-interactive shell.
- Confirmed the Smart Speed verification includes real-audio Web Audio smoke coverage plus LocalAudioPlayer contract coverage for silence-triggered `playbackRate` changes, wall-clock current time and duration mapping, and seek mapping through the same wall-clock domain.

## Screenshots

Need manager decision on whether to capture fresh screenshots or a short video before upstream submission.

## Manager review notes

- Upstream issue-first expectation is documented in `UPSTREAM_PR_CONVENTIONS.md`; no upstream issue number is available yet.
- Upstream-facing verification now has a clean targeted client-package Cypress transcript with no timeout ambiguity.
- Upstream submission should mention that Smart Speed currently targets local playback only and depends on browser Web Audio support for the silence detector path.
