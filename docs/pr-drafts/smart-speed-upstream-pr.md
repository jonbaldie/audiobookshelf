# Smart Speed upstream PR draft

## Proposed title

Add Smart Speed playback for silence compression

## Proposed branch

`feat/smart-speed-playback`

## PR body draft

## Brief summary

Add Smart Speed for local web playback so silent sections longer than 200ms can be played faster without changing normal speech playback.

## Which issue is fixed?

Fixes #3557.

No new upstream issue is needed because advplyr/audiobookshelf#3557 directly covers Smart Speed / trim silence. Closed issue #4155 was marked as a duplicate of #3557.

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
- Result: PASS with Cypress 13.7.3 on Chrome 147 headless, Node v25.9.0.
- Transcript summary: 2 specs found; `SmartSpeedE2E.cy.js` 1 passing in 1s; `LocalAudioPlayer.cy.js` 2 passing in 34ms; overall 3 passing, 0 failing, 0 pending, 0 skipped; `/usr/bin/time` wall duration real 11.55s (user 4.18, sys 0.90).
- Notable non-failing warnings: Nuxt warned to use `build.postcss` instead of an external PostCSS config; non-interactive Cypress/Chrome printed `Opening /dev/tty failed (6): Device not configured`.
- Confirmed the Smart Speed contract covered by tests includes:
  - silence-triggered playbackRate changes
  - wall-clock current time and duration mapping
  - seek mapping through the same wall-clock domain
  - media progress and playback session calculations using coherent current time and duration values
- Reviewed the real-audio Cypress coverage in `client/cypress/tests/players/SmartSpeedE2E.cy.js` for PR talking points and follow-up verification planning

## Screenshots

- Smart Speed settings and compression selector: `client/cypress/screenshots/SmartSpeedUiEvidence.cy.js/smart-speed-settings-and-compression-selector.png`
- Smart Speed active playback indicator: `client/cypress/screenshots/SmartSpeedUiEvidence.cy.js/smart-speed-active-playback-indicator.png`
- Reproduction command from `client/`: `npm run compile-tailwind && npx cypress run --component --browser electron --spec "cypress/tests/players/SmartSpeedUiEvidence.cy.js"`

## Manager review notes

- Existing upstream issue #3557 covers Smart Speed / trim silence, so the PR body can use `Fixes #3557`.
- UI evidence was captured by audiobookshelf-8x1 and is listed above with the reproducible capture command.
- Clean targeted verification was produced by audiobookshelf-f1m and is listed above.
- Upstream submission should mention that Smart Speed currently targets local playback only and depends on browser Web Audio support for the silence detector path.
