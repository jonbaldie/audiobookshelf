import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

describe('Smart Speed Initialization', () => {
  it('enables Smart Speed only when the detector is available', () => {
    const audioContext = {
      destination: { label: 'destination' },
      state: 'running',
      currentTime: 0,
      resume: cy.stub().resolves(),
      suspend: cy.stub().resolves(),
      close: cy.stub().resolves(),
      createMediaElementSource: cy.stub().returns({
        connect: cy.stub(),
        disconnect: cy.stub()
      }),
      audioWorklet: {
        addModule: cy.stub().resolves()
      }
    }

    cy.window().then((win) => {
      // Create a mock audio element
      const audioElement = win.document.createElement('audio')
      audioElement.id = 'test-audio'
      audioElement.src = '/__cypress/fixtures/test-audio.wav'
      win.document.body.appendChild(audioElement)

      // Mock AudioWorkletNode
      win.AudioWorkletNode = function AudioWorkletNode() {
        return {
          connect: cy.stub(),
          disconnect: cy.stub(),
          port: {
            onmessage: null,
            postMessage: cy.stub()
          }
        }
      }

      const player = new LocalAudioPlayer()
      player.player = audioElement
      player.audioContext = audioContext
      player.usingWebAudio = true
      player.audioSourceNode = audioContext.createMediaElementSource(audioElement)
      player.smartSpeedRatio = 2.5

      player.setSmartSpeed(true).then(() => {
        expect(player.enableSmartSpeed).to.equal(true)
        expect(player.silenceDetectorNode).to.exist
      })
    })
  })

  it('leaves Smart Speed disabled when requested off', () => {
    const audioContext = {
      destination: { label: 'destination' },
      state: 'running',
      currentTime: 0,
      resume: cy.stub().resolves(),
      suspend: cy.stub().resolves(),
      close: cy.stub().resolves(),
      createMediaElementSource: cy.stub().returns({
        connect: cy.stub(),
        disconnect: cy.stub()
      }),
      audioWorklet: {
        addModule: cy.stub().resolves().as('audioWorkletAddModule')
      }
    }

    cy.window().then((win) => {
      const audioElement = win.document.createElement('audio')
      audioElement.id = 'test-audio'
      audioElement.src = '/__cypress/fixtures/test-audio.wav'
      win.document.body.appendChild(audioElement)

      const player = new LocalAudioPlayer()
      player.player = audioElement
      player.audioContext = audioContext
      player.usingWebAudio = true
      player.audioSourceNode = audioContext.createMediaElementSource(audioElement)

      player.setSmartSpeed(false).then(() => {
        expect(player.enableSmartSpeed).to.equal(false)
        expect(player.silenceDetectorNode).to.equal(null)
      })
    })
  })
})
