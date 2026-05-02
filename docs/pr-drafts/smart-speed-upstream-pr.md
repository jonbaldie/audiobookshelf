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

- `npm test -- --runInBand client/cypress/tests/players/LocalAudioPlayer.cy.js`
- Confirmed the Smart Speed contract covered by tests includes:
  - silence-triggered playbackRate changes
  - wall-clock current time and duration mapping
  - seek mapping through the same wall-clock domain
  - media progress and playback session calculations using coherent current time and duration values
- Reviewed the real-audio Cypress coverage in `client/cypress/tests/players/SmartSpeedE2E.cy.js` for PR talking points and follow-up verification planning

## Screenshots

Need manager decision on whether to capture fresh screenshots or a short video before upstream submission.

## Manager review notes

- Upstream issue-first expectation is documented in `UPSTREAM_PR_CONVENTIONS.md`; no upstream issue number is available yet.
- Upstream-facing verification may need a cleaner targeted command than the current `npm test -- --runInBand client/cypress/tests/players/LocalAudioPlayer.cy.js`, which completed with 389 passing tests but appears to run the broader Mocha suite before the tool timeout.
- Upstream submission should mention that Smart Speed currently targets local playback only and depends on browser Web Audio support for the silence detector path.
