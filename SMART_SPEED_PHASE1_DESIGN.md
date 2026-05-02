# Smart Speed Phase 1 Design: Web Audio API Pipeline Refactor

## Status
Historical Phase 1 design note for bead `audiobookshelf-hsc` (blocks `audiobookshelf-d8s`).

## Architecture Reality Check
The current shipped Smart Speed path in this branch is silence detection plus temporary `HTMLAudioElement.playbackRate` acceleration during detected silent regions. This document remains useful for the Web Audio pipeline setup, but later notes here about future compression should not be read as already-shipped sample dropping, a second compressor worklet, or crossfade smoothing. That future enhancement work remains tracked separately.

## Objective
Refactor the local audio playback pipeline so that it can optionally route audio through the Web Audio API (AudioContext + MediaElementAudioSourceNode). This prepares the ground for Phase 2 (real-time silence detection) without changing audible behaviour when Smart Speed is OFF.

---

## 1. Current Audio Pipeline Architecture

### 1.1 Core Player Files
- **`client/players/LocalAudioPlayer.js`** — The single source of truth for local HTML5 audio playback.
- **`client/players/PlayerHandler.js`** — Mediates between the UI (`MediaPlayerContainer.vue`) and the concrete player (`LocalAudioPlayer` or `CastPlayer`).
- **`client/players/CastPlayer.js`** — Chromecast player; **out of scope** for this refactor. Smart Speed will only apply to `LocalAudioPlayer`.

### 1.2 How Playback Currently Works

`LocalAudioPlayer` creates a raw `<audio>` element (`#audio-player`), appends it to `<body>`, and drives it directly:

```js
// client/players/LocalAudioPlayer.js (lines 31-40)
var audioEl = document.createElement('audio')
audioEl.id = 'audio-player'
audioEl.style.display = 'none'
document.body.appendChild(audioEl)
this.player = audioEl
```

Playback rate is set on the element itself:

```js
// client/players/LocalAudioPlayer.js (lines 267-271)
setPlaybackRate(playbackRate) {
  if (!this.player) return
  this.defaultPlaybackRate = playbackRate
  this.player.playbackRate = playbackRate
}
```

All other controls (`play`, `pause`, `seek`, `volume`, `currentTime`, `buffered`) interact with this raw `<audio>` node.

### 1.3 HLS Path
For transcoded streams `hls.js` attaches to the same `<audio>` element:

```js
// client/players/LocalAudioPlayer.js (lines 180-183)
this.hlsInstance = new Hls(hlsOptions)
this.hlsInstance.attachMedia(this.player)
```

The Web Audio API pipeline must work for **both** direct-play and HLS paths.

### 1.4 User Settings Store
Settings are stored client-side in `localStorage` via the Vuex module `client/store/user.js`. The default state includes `playbackRate`, `playbackRateIncrementDecrement`, `jumpForwardAmount`, `jumpBackwardAmount`, and `useChapterTrack`. There is **no server-side persistence** of these UI settings; the server `User` model (`server/models/User.js`) does not store playback preferences.

Relevant snippet:

```js
// client/store/user.js (lines 4-22)
settings: {
  orderBy: 'media.metadata.title',
  orderDesc: false,
  filterBy: 'all',
  playbackRate: 1,
  playbackRateIncrementDecrement: 0.1,
  bookshelfCoverSize: 120,
  collapseSeries: false,
  collapseBookSeries: false,
  showSubtitles: false,
  useChapterTrack: false,
  seriesSortBy: 'name',
  seriesSortDesc: false,
  seriesFilterBy: 'all',
  authorSortBy: 'name',
  authorSortDesc: false,
  jumpForwardAmount: 10,
  jumpBackwardAmount: 10
}
```

---

## 2. Proposed Web Audio API Pipeline

### 2.1 High-Level Architecture

```
┌──────────────┐     ┌──────────────────────────────┐     ┌─────────┐
│  <audio>     │────▶│ MediaElementAudioSourceNode  │────▶│  Gain   │────▶ speakers
│ (src/HLS)    │     │ (created once per lifecycle) │     │  Node   │
└──────────────┘     └──────────────────────────────┘     └─────────┘
                                                             │
                                                             ▼
                                                    (future: AudioWorkletNode
                                                     for silence detection)
```

Even when Smart Speed is **disabled**, audio will flow through the AudioContext. This guarantees that:
1. The pipeline is already initialised when the user toggles Smart Speed ON.
2. Phase 2 only needs to insert/remap an `AudioWorkletNode` between `MediaElementAudioSourceNode` and the destination.

### 2.2 Playback Rate Through AudioContext

When the Web Audio pipeline is active, setting `audio.playbackRate` will **not** be sufficient if we later insert a worklet that manipulates time. However, for Phase 1 we have two compatible options:

**Option A (recommended):** Keep using `audio.playbackRate` even when routed through AudioContext. The `MediaElementAudioSourceNode` respects the media element's playback rate—its output clock is tied to the element. This is the simplest approach and requires zero additional code for rate control in Phase 1.

**Option B (future):** Use `AudioBufferSourceNode` with `playbackRate` param. This would break the HLS path (HLS needs a media element) and is therefore rejected.

> We will proceed with **Option A** for Phase 1.

### 2.3 Lifecycle Rules
- One `AudioContext` per `LocalAudioPlayer` instance.
- One `MediaElementAudioSourceNode` per `AudioContext`.
- `AudioContext.state` must be resumed from a user gesture (e.g. `play()`). We will call `audioCtx.resume()` inside `play()`.
- `LocalAudioPlayer.destroy()` must close the context and disconnect all nodes to prevent memory leaks.
- Volume control should remain on the `<audio>` element (`audio.volume`) for simplicity unless we need node-level panning later.

---

## 3. `enableSmartSpeed` User Setting

### 3.1 Where to Add
Add `enableSmartSpeed: false` to the `settings` object in:
- **`client/store/user.js`** (default state)

No server-side change is required because user settings are purely client-side (`localStorage`).

### 3.2 UI Location
A toggle will eventually be added to `PlayerSettingsModal.vue` alongside `useChapterTrack`, `jumpForwardAmount`, etc. That work is deferred to Phase 4; for Phase 1 we only need the setting to exist in the store.

---

## 4. Fallback Strategy

### 4.1 Feature Detection
```js
const supportsWebAudio = typeof window !== 'undefined' && window.AudioContext || window.webkitAudioContext
```

If `AudioContext` is unavailable (very rare in modern browsers), `LocalAudioPlayer` should operate exactly as it does today—no `<audio>` wrapping, direct playback.

### 4.2 iOS / Safari Considerations
Safari requires `AudioContext.resume()` after a user gesture. Calling it inside `play()` covers this. `webkitAudioContext` prefix is still needed for very old Safari versions; the fallback handles both.

### 4.3 HLS Compatibility
`hls.js` attaches to the `<audio>` element. Since the element itself does not change—only its audio output is redirected via `MediaElementAudioSourceNode`—HLS continues to function identically.

---

## 5. Files That Need Modification

| File | Change |
|------|--------|
| `client/players/LocalAudioPlayer.js` | Wrap `<audio>` in `AudioContext` + `MediaElementAudioSourceNode`; add `supportsWebAudio` flag; update `destroy()` to close context; update `play()` to resume context |
| `client/store/user.js` | Add `enableSmartSpeed: false` to default state |
| `client/strings/en-us.json` | Add `LabelEnableSmartSpeed` (deferred to Phase 4, but documented here) |
| `client/components/modals/PlayerSettingsModal.vue` | Add toggle UI (deferred to Phase 4) |

---

## 6. Minimal Skeleton Implementation (Phase 1)

The following diff-style plan outlines a **non-breaking** change to `LocalAudioPlayer.js`.

### 6.1 Add AudioContext properties
```js
constructor(ctx) {
  // ... existing ...
  this.audioContext = null
  this.audioSourceNode = null
  this.usingWebAudio = false
  // ...
}
```

### 6.2 Initialise pipeline after audio element creation
```js
initialize() {
  // ... existing audio element creation ...
  this.initWebAudio()
}

initWebAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) {
    console.warn('[LocalPlayer] Web Audio API not supported, falling back to direct audio')
    return
  }
  try {
    this.audioContext = new AudioContextCtor()
    this.audioSourceNode = this.audioContext.createMediaElementSource(this.player)
    this.audioSourceNode.connect(this.audioContext.destination)
    this.usingWebAudio = true
    console.log('[LocalPlayer] Web Audio API pipeline initialised')
  } catch (err) {
    console.error('[LocalPlayer] Failed to initialise Web Audio API', err)
    this.usingWebAudio = false
  }
}
```

### 6.3 Resume context on play
```js
play() {
  this.playWhenReady = true
  if (this.player) {
    if (this.usingWebAudio && this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    this.player.play()
  }
}
```

### 6.4 Clean up on destroy
```js
destroy() {
  this.destroyHlsInstance()
  if (this.audioContext) {
    this.audioContext.close()
    this.audioContext = null
  }
  if (this.audioSourceNode) {
    this.audioSourceNode.disconnect()
    this.audioSourceNode = null
  }
  if (this.player) {
    this.player.remove()
  }
}
```

### 6.5 No change to `setPlaybackRate`
Because we are using Option A, `setPlaybackRate` continues to set `this.player.playbackRate = playbackRate`. The `MediaElementAudioSourceNode` inherits this rate.

---

## 7. Testing Checklist (Manual)

- [ ] Audio plays normally through Web Audio pipeline with `usingWebAudio = true`
- [ ] Playback rate changes are audible and reported correctly in UI
- [ ] HLS transcoded streams still play
- [ ] No audible degradation or latency is introduced
- [ ] Player can be destroyed and re-created without leaking AudioContexts (check DevTools Performance tab)
- [ ] `enableSmartSpeed` setting persists in `localStorage` across reloads
- [ ] Graceful fallback on browsers with no `AudioContext`

---

## 8. Phase 2+ Notes (Out of Scope)

- **Silence detection:** An `AudioWorkletNode` (or `ScriptProcessorNode` fallback) will be inserted between `audioSourceNode` and `audioContext.destination`.
- **Silence shortening implementation after Phase 1:** the branch currently accelerates the media element playback rate during detected silence instead of dropping samples from a second compressor worklet.
- **Progress tracking:** When Smart Speed is ON, wall-clock time and `audio.currentTime` will diverge. The UI must account for this—`LocalAudioPlayer.getCurrentTime()` may need to map compressed time back to real time for progress sync.
- **Future enhancement only:** true sample dropping, boundary smoothing, or crossfade-style silence excision would require follow-up implementation beyond the shipped playbackRate-based design.
- **CastPlayer:** Will continue to receive normal-speed audio unaffected.

---

*Document produced as part of bead `audiobookshelf-hsc` — Smart Speed Phase 1.*
