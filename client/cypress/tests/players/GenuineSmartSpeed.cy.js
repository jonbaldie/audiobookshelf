import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

function base64ToBlobUrl(base64Audio) {
  const binary = atob(base64Audio)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
}

function createUiHarness(doc, onPlay) {
  const button = doc.createElement('button')
  button.type = 'button'
  button.id = 'smart-speed-play'
  button.setAttribute('aria-label', 'Play')
  button.innerText = 'Play'
  button.addEventListener('click', onPlay)
  doc.body.appendChild(button)
  return button
}

describe('Genuine E2E Smart Speed Verification', () => {
  let player
  let audioUrl

  beforeEach(() => {
    cy.readFile('players/smart-speed/SilenceDetectorProcessor.js', 'utf8').then((content) => {
      cy.intercept('GET', '**/SilenceDetectorProcessor.js', {
        statusCode: 200,
        headers: { 'Content-Type': 'application/javascript' },
        body: content
      }).as('getWorklet')
    })
  })

  afterEach(() => {
    if (player) {
      player.destroy()
      player = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      audioUrl = null
    }
  })

  it('loads the real fixture and verifies smart-speed playback through the browser audio pipeline', () => {
    cy.fixture('test-audio.wav', 'base64').then((base64Audio) => {
      audioUrl = base64ToBlobUrl(base64Audio)

      player = new LocalAudioPlayer({})
      player.smartSpeedRatio = 2.5
      player.setPlaybackRate(1)

      const tracks = [
        {
          index: 1,
          startOffset: 0,
          duration: 4,
          relativeContentUrl: audioUrl,
          mimeType: 'audio/wav'
        }
      ]

      const libraryItem = {
        id: 'test-item',
        media: { tracks }
      }

      let startTime = 0
      let endTime = 0
      const playbackRates = []

      const finished = new Cypress.Promise((resolve) => {
        player.on('finished', () => {
          endTime = performance.now()
          resolve()
        })
      })

      cy.document().then((doc) => {
        createUiHarness(doc, async () => {
          await player.setSmartSpeed(true)
          startTime = performance.now()
          player.play()
        })
      })

      player.set(libraryItem, tracks, false, 0, false)

      const sampleRates = setInterval(() => {
        if (player?.player) {
          playbackRates.push(player.player.playbackRate)
        }
      }, 50)

      cy.get('#smart-speed-play').click()
      cy.wait('@getWorklet')

      cy.wrap(finished, { timeout: 10000 }).then(() => {
        clearInterval(sampleRates)

        const wallClockSeconds = (endTime - startTime) / 1000
        const firstFastIndex = playbackRates.findIndex((rate) => rate === 2.5)

        expect(player.usingWebAudio, 'real Web Audio pipeline').to.equal(true)
        expect(player.silenceDetectorNode, 'real AudioWorklet node').to.exist
        expect(firstFastIndex, 'playback rate reached 2.5x').to.be.greaterThan(-1)
        expect(playbackRates.slice(firstFastIndex + 1), 'playback returned to 1x').to.include(1)
        expect(wallClockSeconds, 'wall-clock playback time').to.be.lessThan(3.5)
      })
    })
  })
})
