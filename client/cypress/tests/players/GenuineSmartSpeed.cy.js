import LocalAudioPlayer from '../../../players/LocalAudioPlayer'

describe('Genuine E2E Smart Speed Verification', () => {
  let player;

  beforeEach(() => {
    // Intercept the AudioWorklet fetch request and serve the actual file from disk
    cy.readFile('players/smart-speed/SilenceDetectorProcessor.js', 'utf8').then((content) => {
      cy.intercept('GET', '**/SilenceDetectorProcessor.js', {
        statusCode: 200,
        headers: { 'Content-Type': 'application/javascript' },
        body: content
      }).as('getWorklet');
    });

    // Also need to mock LocalStorage for the user settings or rely on LocalAudioPlayer defaults
  });

  it('compresses a real 4-second audio file (1s tone, 2s silence, 1s tone) down to ~2.8 seconds', () => {
    // 1. Create a raw player
    player = new LocalAudioPlayer({});
    
    // 2. Load the test audio fixture
    cy.fixture('test-audio.wav', 'base64').then((base64Audio) => {
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;

      // 3. Stub tracks data structure expected by LocalAudioPlayer
      const tracks = [{
        index: 1,
        startOffset: 0,
        duration: 4,
        relativeContentUrl: audioUrl,
        mimeType: 'audio/wav'
      }];

      const libraryItem = { id: 'test-item', media: { tracks } };

      // 4. Hook up an event listener to measure time
      let startTime = 0;
      let endTime = 0;
      let rateHit2_5 = false;
      let rateHit1_0 = false;
      
      const playPromise = new Cypress.Promise((resolve) => {
        player.on('finished', () => {
          endTime = performance.now();
          resolve();
        });
      });

      // 5. Initialize the track
      player.set(libraryItem, tracks, false, 0, false);
      player.setPlaybackRate(1.0);
      player.smartSpeedRatio = 2.5;
      
      // We must mock emitting timeupdate or just waiting/playing events if needed.
      // But LocalAudioPlayer wires this up internally.

      // We need to bypass Chrome's autoplay block in Cypress. 
      // Clicking a dummy button usually does it.
      cy.document().then((doc) => {
        const btn = doc.createElement('button');
        btn.id = 'play-btn';
        btn.innerText = 'Play';
        btn.onclick = async () => {
          await player.setSmartSpeed(true);
          startTime = performance.now();
          player.play();
        };
        doc.body.appendChild(btn);
      });

      cy.get('#play-btn').click();

      // 6. Polling observer for playbackRate changes
      const checkInterval = setInterval(() => {
        if (!player.player) return;
        const rate = player.player.playbackRate;
        if (rate === 2.5) rateHit2_5 = true;
        // Verify it also dropped back down to 1.0 after the silence
        if (rateHit2_5 && rate === 1.0) rateHit1_0 = true;
      }, 50);

      // 7. Wait for playback to finish
      cy.wrap(playPromise, { timeout: 10000 }).then(() => {
        clearInterval(checkInterval);
        
        const totalWallClockTime = (endTime - startTime) / 1000;
        
        cy.log(`Total Wall Clock Time: ${totalWallClockTime.toFixed(2)}s`);
        
        // The original audio is 4.0s long.
        // It has 2s of silence. At 2.5x speed, the silence takes 2 / 2.5 = 0.8s.
        // 1s tone + 0.8s compressed silence + 1s tone = 2.8s theoretical perfect time.
        // Allow some buffer for Web Audio graph initialization and event latency.
        expect(totalWallClockTime).to.be.lessThan(3.5);
        expect(totalWallClockTime).to.be.greaterThan(2.5);

        // Verify the playback rate dynamically jumped
        expect(rateHit2_5, 'Playback rate dynamically reached 2.5x').to.be.true;
        expect(rateHit1_0, 'Playback rate dynamically reverted to 1.0x').to.be.true;
      });
    });
  });
});