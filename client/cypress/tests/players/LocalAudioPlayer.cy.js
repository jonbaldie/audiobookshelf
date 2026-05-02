import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

describe('LocalAudioPlayer', () => {
  let mockPort;
  let mockAudioContext;
  let mockAudioWorkletNode;
  let mockSourceNode;

  beforeEach(() => {
    // Mock for AudioWorkletNode message port
    mockPort = {
      onmessage: null,
      postMessage: cy.stub()
    };

    mockAudioWorkletNode = {
      port: mockPort,
      connect: cy.stub(),
      disconnect: cy.stub()
    };

    mockSourceNode = {
      connect: cy.stub(),
      disconnect: cy.stub()
    };

    // Mock AudioContext
    mockAudioContext = {
      audioWorklet: {
        addModule: cy.stub().resolves()
      },
      createMediaElementSource: cy.stub().returns(mockSourceNode),
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

  it('keeps playbackRate stable while recording silence regions', () => {
    const localPlayer = new LocalAudioPlayer({});
    expect(localPlayer.player.playbackRate).to.equal(1);

    cy.wrap(localPlayer).should('have.property', 'usingWebAudio', true).then(() => {
      return localPlayer.setSmartSpeed(true);
    }).then(() => {
      expect(localPlayer.enableSmartSpeed).to.be.true;
      expect(mockAudioContext.audioWorklet.addModule).to.have.been.calledWith('/client/players/smart-speed/SilenceDetectorProcessor.js');
      expect(localPlayer.silenceDetectorNode).to.equal(mockAudioWorkletNode);
      expect(mockSourceNode.connect).to.have.been.calledWith(mockAudioWorkletNode);
      expect(mockAudioWorkletNode.connect).to.have.been.calledWith(mockAudioContext.destination);

      mockPort.onmessage({
        data: {
          type: 'silence-start',
          time: 5000
        }
      });

      expect(localPlayer.player.playbackRate).to.equal(1.0);

      mockPort.onmessage({
        data: {
          type: 'silence-end',
          time: 8000
        }
      });

      expect(localPlayer.player.playbackRate).to.equal(1.0);
      expect(localPlayer.silenceMap.getRegions()).to.deep.equal([{ start: 0, end: 3000 }]);
    });
  });

  it('drops duplicate or overlapping silence updates before tracking them', () => {
    const localPlayer = new LocalAudioPlayer({});

    cy.wrap(localPlayer).then(() => localPlayer.setSmartSpeed(true)).then(() => {
      expect(localPlayer.addSmartSpeedRegion(1000, 2000)).to.equal(true);
      expect(localPlayer.addSmartSpeedRegion(1500, 2500)).to.equal(true);
      expect(localPlayer.addSmartSpeedRegion(1200, 1800)).to.equal(false);

      expect(localPlayer.silenceMap.getRegions()).to.deep.equal([{ start: 1000, end: 2500 }]);
    });
  });

  it('reports wall-clock current time when smart speed has saved time', () => {
    const localPlayer = new LocalAudioPlayer({});

    localPlayer.currentTrackIndex = 0;
    localPlayer.audioTracks = [{ startOffset: 0, duration: 60 }];
    localPlayer.player.currentTime = 5;
    localPlayer.smartSpeedRatio = 2.0;
    localPlayer.enableSmartSpeed = true;
    localPlayer.silenceMap.addRegion(1000, 3000);
    localPlayer.updateSmartSpeedRegions();

    expect(localPlayer.getCurrentTime()).to.equal(4);
  });
});
