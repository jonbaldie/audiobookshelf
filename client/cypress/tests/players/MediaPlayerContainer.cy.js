import Vue from 'vue'
import Vuex from 'vuex'
import MediaPlayerContainer from '../../../components/app/MediaPlayerContainer.vue'
import * as rootStore from '../../../store/index'
import * as userStore from '../../../store/user'
import * as globalsStore from '../../../store/globals'
import * as librariesStore from '../../../store/libraries'

Vue.use(Vuex)

const FIXTURE_URL = '/__cypress/fixtures/test-audio.wav'
const TEST_LIBRARY_ID = 'lib-test'
const TEST_ITEM_ID = 'item-test'
const TEST_SESSION_ID = 'session-test'
const SESSION_TRACK_URL = `/public/session/${TEST_SESSION_ID}/track/0`

const makeLibraryItem = () => ({
  id: TEST_ITEM_ID,
  libraryId: TEST_LIBRARY_ID,
  mediaType: 'book',
  updatedAt: 1714608000000,
  media: {
    coverPath: null,
    duration: 4,
    metadata: {
      title: 'Smart Speed Harness Fixture',
      authors: [{ id: 'author-1', name: 'Harness Author' }],
      explicit: false
    },
    chapters: [{ id: 'chapter-1', start: 0, end: 4, title: 'Fixture Chapter' }]
  }
})

const buildStore = () => {
  return new Vuex.Store({
    state: rootStore.state(),
    getters: rootStore.getters,
    mutations: rootStore.mutations,
    modules: {
      user: {
        namespaced: true,
        state: userStore.state(),
        getters: userStore.getters,
        mutations: userStore.mutations,
        actions: userStore.actions
      },
      globals: {
        namespaced: true,
        state: globalsStore.state(),
        getters: globalsStore.getters,
        mutations: globalsStore.mutations
      },
      libraries: {
        namespaced: true,
        state: librariesStore.state(),
        getters: librariesStore.getters,
        mutations: librariesStore.mutations
      }
    }
  })
}

const createAudioContextStub = () => {
  const sourceNode = {
    connect: cy.stub().as('audioSourceConnect'),
    disconnect: cy.stub().as('audioSourceDisconnect')
  }

  const audioContext = {
    destination: { label: 'destination' },
    state: 'running',
    currentTime: 0,
    resume: cy.stub().callsFake(() => {
      audioContext.state = 'running'
      return Promise.resolve()
    }).as('audioContextResume'),
    suspend: cy.stub().callsFake(() => {
      audioContext.state = 'suspended'
      return Promise.resolve()
    }).as('audioContextSuspend'),
    close: cy.stub().resolves().as('audioContextClose'),
    createMediaElementSource: cy.stub().returns(sourceNode).as('createMediaElementSource'),
    audioWorklet: {
      addModule: cy.stub().resolves().as('audioWorkletAddModule')
    }
  }

  return { audioContext }
}

describe('MediaPlayerContainer', () => {
  beforeEach(() => {
    cy.viewport(1280, 900)

    cy.window().then((win) => {
      win.MediaMetadata = function MediaMetadata(metadata) {
        Object.assign(this, metadata)
      }
      const mediaSession = {
        playbackState: 'none',
        metadata: null,
        setActionHandler: cy.stub().as('setActionHandler')
      }

      Object.defineProperty(win.navigator, 'mediaSession', {
        configurable: true,
        get() {
          return mediaSession
        }
      })
    })
  })

  it('runs real PlayerUi init through smart speed setup', () => {
    const store = buildStore()
    const eventBus = new Vue()
    const libraryItem = makeLibraryItem()
    const { audioContext } = createAudioContextStub()

    // Set up window stubs BEFORE mounting
    cy.window().then((win) => {
      win.AudioContext = function AudioContext() {
        return audioContext
      }
      win.webkitAudioContext = undefined

      win.AudioWorkletNode = function AudioWorkletNode() {
        return {
          connect: cy.stub().as('silenceDetectorConnect'),
          disconnect: cy.stub().as('silenceDetectorDisconnect'),
          port: {
            onmessage: null,
            postMessage: cy.stub().as('silenceDetectorPostMessage')
          }
        }
      }

      cy.stub(win.HTMLMediaElement.prototype, 'load').callsFake(function load() {
        if (this.__absLoadedMetadataDispatched) return

        this.__absLoadedMetadataDispatched = true
        setTimeout(() => {
          this.dispatchEvent(new win.Event('loadedmetadata'))
        }, 0)
      }).as('mediaLoad')

      cy.stub(win.HTMLMediaElement.prototype, 'play').callsFake(function play() {
        if (this.__absIsPlaying) return Promise.resolve()

        this.__absIsPlaying = true
        setTimeout(() => {
          this.dispatchEvent(new win.Event('play'))
          this.dispatchEvent(new win.Event('playing'))
        }, 0)
        return Promise.resolve()
      }).as('mediaPlayCall')

      cy.stub(win.HTMLMediaElement.prototype, 'pause').callsFake(function pause() {
        if (!this.__absIsPlaying) return

        this.__absIsPlaying = false
        this.dispatchEvent(new win.Event('pause'))
      }).as('mediaPause')
    })

    store.commit('setRouterBasePath', '')
    store.commit('libraries/addUpdate', {
      id: TEST_LIBRARY_ID,
      mediaType: 'book',
      settings: { coverAspectRatio: 0 }
    })
    store.commit('libraries/setCurrentLibrary', { id: TEST_LIBRARY_ID })
    store.commit('user/setUser', {
      id: 'user-1',
      type: 'root',
      mediaProgress: [],
      bookmarks: [],
      permissions: { update: true, delete: true, download: true, upload: true, accessAllLibraries: true },
      librariesAccessible: [TEST_LIBRARY_ID]
    })
    store.commit('user/setSettings', {
      ...store.state.user.settings,
      enableSmartSpeed: true,
      smartSpeedRatio: 2.5,
      playbackRate: 1,
      playbackRateIncrementDecrement: 0.1,
      jumpForwardAmount: 10,
      jumpBackwardAmount: 10,
      useChapterTrack: false
    })

    cy.intercept('GET', `/api/items/${TEST_ITEM_ID}?expanded=1`, {
      statusCode: 200,
      body: libraryItem
    }).as('getLibraryItem')

    cy.intercept('POST', `/api/items/${TEST_ITEM_ID}/play`, (req) => {
      expect(req.body.mediaPlayer).to.equal('html5')
      req.reply({
        statusCode: 200,
        body: {
          id: TEST_SESSION_ID,
          libraryItem,
          episodeId: null,
          displayTitle: 'Smart Speed Harness Fixture',
          displayAuthor: 'Harness Author',
          currentTime: 0,
          playMethod: 0,
          audioTracks: [
            {
              index: 0,
              startOffset: 0,
              duration: 4,
              contentUrl: FIXTURE_URL,
              mimeType: 'audio/wav'
            }
          ]
        }
      })
    }).as('startPlaybackSession')

    cy.intercept('POST', `/api/session/${TEST_SESSION_ID}/close`, {
      statusCode: 200,
      body: {}
    }).as('closePlaybackSession')

    cy.intercept('POST', `/api/session/${TEST_SESSION_ID}/sync`, {
      statusCode: 200,
      body: {}
    }).as('syncPlaybackSession')

    cy.mount(MediaPlayerContainer, {
      store,
      stubs: {
        'covers-book-cover': { template: '<div data-testid="cover"></div>' },
        'ui-tooltip': { template: '<div><slot /></div>' },
        'modals-bookmarks-modal': { template: '<div />' },
        'modals-sleep-timer-modal': { template: '<div />' },
        'modals-player-queue-items-modal': { template: '<div />' },
        'modals-chapters-modal': { template: '<div />' },
        'modals-player-settings-modal': { template: '<div />' },
        'controls-playback-speed-control': {
          template: '<div />',
          model: { prop: 'value', event: 'input' },
          props: ['value']
        },
        'player-ui': false,
        'controls-volume-control': {
          template: '<div />',
          model: { prop: 'value', event: 'input' },
          props: ['value'],
          methods: {
            toggleMute() {}
          }
        },
        'player-playback-controls': {
          template: '<button aria-label="Play" @click="$emit(\'playPause\')">Play</button>'
        },
        'player-track-bar': {
          template: '<div />',
          methods: {
            setDuration() {},
            setUseChapterTrack() {},
            setCurrentTime() {},
            setBufferTime() {},
            setPercentageReady() {}
          }
        },
        'nuxt-link': { template: '<a><slot /></a>' }
      },
      mocks: {
        $axios: {
          $get: (url) => fetch(url).then((res) => res.json()),
          $post: (url, body) => fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
          }).then((res) => res.json())
        },
        $eventBus: eventBus,
        $toast: Object.assign(cy.stub().as('toast'), {
          info: cy.stub().as('toastInfo'),
          dismiss: cy.stub().as('toastDismiss')
        }),
        $config: { routerBasePath: '' },
        $socket: { client: { on: cy.stub(), off: cy.stub(), emit: cy.stub() } },
        $hotkeys: { AudioPlayer: {} },
        $secondsToTimestamp: (seconds) => {
          const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
          const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
          const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
          const secs = String(totalSeconds % 60).padStart(2, '0')
          return `${hours}:${minutes}:${secs}`
        },
        $getString: (key, values = []) => [key, ...values].join(' '),
        $randomId: () => 'device-test-id'
      }
    })

    cy.then(() => {
      eventBus.$emit('play-item', { libraryItemId: TEST_ITEM_ID })
    })

    cy.wait('@getLibraryItem')
    cy.wait('@startPlaybackSession').its('request.body').should('deep.include', {
      mediaPlayer: 'html5',
      forceTranscode: false
    })

    // Wait for component to be fully mounted and ready
    cy.get('#mediaPlayerContainer', { timeout: 10000 }).should('be.visible')
    
    // Verify PlayerUi is mounted and has init called
    cy.then(() => {
      const vm = Cypress.vueWrapper.vm
      expect(vm.$refs.audioPlayer).to.exist
      expect(vm.$refs.audioPlayer.init).to.be.a('function')
    })

    cy.get('button[aria-label="Play"]').click()

    // Check that Smart Speed was initialized
    cy.get('@audioWorkletAddModule').should('have.been.calledWith', '/client/players/smart-speed/SilenceDetectorProcessor.js')
    
    // Verify playback started
    cy.get('@mediaLoad').should('have.been.called')
    cy.get('@createMediaElementSource').should('have.been.calledOnce')
    
    cy.then(() => {
      const vm = Cypress.vueWrapper.vm
      expect(vm.playerHandler.libraryItemId).to.equal(TEST_ITEM_ID)
      expect(vm.playerHandler.isPlayingLocalItem).to.equal(true)
    })
  })
})
