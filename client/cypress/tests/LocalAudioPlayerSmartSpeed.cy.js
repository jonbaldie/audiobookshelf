import LocalAudioPlayer from '@/players/LocalAudioPlayer'
import * as silenceDetector from '@/players/silenceDetector'

describe('LocalAudioPlayer smart-speed skip logic', () => {
  it('advances currentTime by detected interval end plus epsilon when smartSpeedEnabled', () => {
    // Create a minimal context with Vuex stub and eventBus stub
    const ctx = {
      $store: {
        getters: {
          'user/getUserSetting': () => true
        }
      },
      $eventBus: { $on: () => {} }
    }
    const player = new LocalAudioPlayer(ctx)
    // Stub the HTMLAudioElement
    player.player = { currentTime: 10 }
    // Stub AudioContext sample rate
    player.audioCtx = { sampleRate: 1000 }
    // Ensure smartSpeed is on and skipLock clear
    player.smartSpeedEnabled = true
    player._skipLock = false
    // Use a real silent buffer so detectSilences picks it up
    player.audioCtx = { sampleRate: 1000 }
    const fakeSamples = new Float32Array(2048).fill(0)
    const event = { inputBuffer: { getChannelData: () => fakeSamples } }
    player.handleAudioProcess(event)
    // Expect currentTime to have jumped by buffer duration + epsilon
    const bufferSec = fakeSamples.length / player.audioCtx.sampleRate
    expect(player.player.currentTime).to.be.closeTo(10 + bufferSec + 0.01, 0.0001)
  })

  it('does not change currentTime when smartSpeedEnabled is false', () => {
    const ctx = {
      $store: {
        getters: {
          'user/getUserSetting': () => false
        }
      },
      $eventBus: { $on: () => {} }
    }
    const player = new LocalAudioPlayer(ctx)
    player.player = { currentTime: 5 }
    player.audioCtx = { sampleRate: 1000 }
    player.smartSpeedEnabled = false
    player._skipLock = false
    cy.stub(silenceDetector, 'detectSilences').returns([{ start: 0, end: 2 }])
    const fakeSamples = new Float32Array(2048).fill(0)
    const event = { inputBuffer: { getChannelData: () => fakeSamples } }
    player.handleAudioProcess(event)
    // currentTime should remain unchanged
    expect(player.player.currentTime).to.equal(5)
  })
})