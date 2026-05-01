import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

describe('LocalAudioPlayer', () => {
  let mockPort;
  let mockAudioContext;
  let mockAudioWorkletNode;

  beforeEach(() => {
    // Mock for AudioWorkletNode message port
    mockPort = {
      onmessage: null,
      postMessage: cy.stub()
    };

    // Mock AudioWorkletNode
    mockAudioWorkletNode = {
      port: mockPort,
      connect: cy.stub(),
      disconnect: cy.stub()
    };

    // Mock AudioContext
    mockAudioContext = {
      audioWorklet: {
        addModule: cy.stub().resolves()
      },
      createMediaElementSource: cy.stub().returns({
        connect: cy.stub(),
        disconnect: cy.stub()
      }),
      destination: {},
      state: 'running',
      currentTime: 10
    };

    // Make AudioWorkletNode available globally so `new AudioWorkletNode` works
    if (!window.AudioWorkletNode) {
      window.AudioWorkletNode = function() { return mockAudioWorkletNode; };
    } else {
      cy.stub(window, 'AudioWorkletNode').returns(mockAudioWorkletNode);
    }
    
    if (!window.AudioContext) {
      window.AudioContext = function() { return mockAudioContext; };
    } else {
      cy.stub(window, 'AudioContext').returns(mockAudioContext);
    }
    
    if (window.webkitAudioContext) {
      cy.stub(window, 'webkitAudioContext').returns(mockAudioContext);
    }
  });

  it('increases playbackRate during silence', () => {
    const localPlayer = new LocalAudioPlayer({});
    
    // Default playback rate should be 1
    expect(localPlayer.player.playbackRate).to.equal(1);
    
    cy.wrap(localPlayer).should('have.property', 'usingWebAudio', true).then(() => {
      // Enable smart speed (this should trigger initSilenceDetector)
      return localPlayer.setSmartSpeed(true);
    }).then(() => {
      expect(localPlayer.enableSmartSpeed).to.be.true;
      expect(mockAudioContext.audioWorklet.addModule).to.have.been.calledWith('/client/players/smart-speed/SilenceDetectorProcessor.js');
      expect(localPlayer.silenceDetectorNode).to.equal(mockAudioWorkletNode);
      
      // Simulate silence start
      mockPort.onmessage({
        data: {
          type: 'silence-start',
          time: 5000 // 5 seconds
        }
      });
      
      // The smartSpeedRatio is 2.0 by default, so playbackRate should be 2.0
      expect(localPlayer.player.playbackRate).to.equal(2.0);
      
      // Simulate silence end
      mockPort.onmessage({
        data: {
          type: 'silence-end',
          time: 8000 // 8 seconds
        }
      });
      
      // Should return to default 1.0
      expect(localPlayer.player.playbackRate).to.equal(1.0);
    });
  });

  it('reports wall-clock current time when smart speed has detected silence', () => {
    const localPlayer = new LocalAudioPlayer({});

    localPlayer.audioTracks = [{ startOffset: 0, duration: 120, relativeContentUrl: '/track-1.mp3' }];
    localPlayer.currentTrackIndex = 0;
    localPlayer.smartSpeedRatio = 2.0;
    localPlayer.player.currentTime = 8;
    localPlayer.silenceMap.addRegion(2000, 6000);
    localPlayer.updateSmartSpeedRegions();

    expect(localPlayer.getCurrentTime()).to.equal(6);
  });

  it('maps wall-clock seek targets back to audio time when smart speed is active', () => {
    const localPlayer = new LocalAudioPlayer({});

    localPlayer.audioTracks = [{ startOffset: 0, duration: 120, relativeContentUrl: '/track-1.mp3' }];
    localPlayer.currentTrackIndex = 0;
    localPlayer.smartSpeedRatio = 2.0;
    localPlayer.enableSmartSpeed = true;
    localPlayer.silenceMap.addRegion(2000, 6000);
    localPlayer.updateSmartSpeedRegions();

    localPlayer.seek(6, false);

    expect(localPlayer.player.currentTime).to.equal(8);
  });
});
