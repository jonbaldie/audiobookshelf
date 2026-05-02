import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

describe('Smart Speed Initialization', () => {
  it('calls audioWorklet.addModule when Smart Speed is enabled', () => {
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

      // Create player instance
      const player = new LocalAudioPlayer()
      player.player = audioElement
      player.audioContext = audioContext
      player.usingWebAudio = true
      player.audioSourceNode = audioContext.createMediaElementSource(audioElement)
      player.smartSpeedRatio = 2.5

      // Call setSmartSpeed with enabled=true
      player.setSmartSpeed(true).then(() => {
        // Verify audioWorklet.addModule was called with the correct path
        cy.get('@audioWorkletAddModule').should('have.been.calledOnce')
        cy.get('@audioWorkletAddModule').should(
          'have.been.calledWith',
          '/client/players/smart-speed/SilenceDetectorProcessor.js'
        )
      })
    })
  })

  it('does not initialize worklet when Smart Speed is disabled', () => {
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

      // Call setSmartSpeed with enabled=false
      player.setSmartSpeed(false).then(() => {
        // Verify audioWorklet.addModule was NOT called
        cy.get('@audioWorkletAddModule').should('not.have.been.called')
      })
    })
  })
})
