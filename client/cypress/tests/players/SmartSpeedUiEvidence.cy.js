import Vue from 'vue'
import Vuex from 'vuex'
import PlayerSettingsModal from '../../../components/modals/PlayerSettingsModal.vue'
import PlayerTrackBar from '../../../components/player/PlayerTrackBar.vue'
import ModalsModal from '../../../components/modals/Modal.vue'
import UiSelectInput from '../../../components/ui/SelectInput.vue'
import UiToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import * as rootStore from '../../../store/index'
import * as userStore from '../../../store/user'
import * as globalsStore from '../../../store/globals'

Vue.use(Vuex)
Vue.component('modals-modal', ModalsModal)
Vue.component('ui-select-input', UiSelectInput)
Vue.component('ui-toggle-switch', UiToggleSwitch)

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
      }
    }
  })
}

describe('Smart Speed UI evidence capture', () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    Vue.prototype.$eventBus = new Vue()
    Vue.prototype.$getString = (key, args = []) => {
      const value = Vue.prototype.$strings[key] || key
      return args.reduce((result, arg, index) => result.replace(`{${index}}`, arg), value)
    }
  })

  it('captures enabled setting and compression selector', () => {
    const store = buildStore()
    store.commit('user/setSettings', {
      ...store.state.user.settings,
      enableSmartSpeed: true,
      smartSpeedRatio: 2.5
    })

    cy.mount({
      components: { PlayerSettingsModal },
      data: () => ({ showSettings: false }),
      mounted() {
        this.showSettings = true
      },
      template: '<player-settings-modal v-model="showSettings" />'
    }, { store })

    cy.contains('Enable Smart Speed').should('be.visible')
    cy.contains('Smart Speed Compression Ratio').should('be.visible')
    cy.contains('2.5x').should('be.visible')
    cy.contains('Smart Speed Compression Ratio').parent().find('button').click()
    cy.contains('5.0x').should('be.visible')
    cy.screenshot('smart-speed-settings-and-compression-selector')
  })

  it('captures active playback indicator', () => {
    const store = buildStore()
    store.commit('user/setSettings', {
      ...store.state.user.settings,
      enableSmartSpeed: true,
      smartSpeedRatio: 2.5
    })

    cy.mount({
      components: { PlayerTrackBar },
      template: `
        <div class="min-h-screen bg-bg p-12 text-white">
          <div class="mt-24 max-w-3xl">
            <player-track-bar :duration="300" :current-chapter="{ start: 0, end: 300 }" :chapters="[]" :playback-rate="1" />
          </div>
        </div>
      `
    }, { store })

    cy.contains('Smart Speed Active').should('be.visible')
    cy.screenshot('smart-speed-active-playback-indicator')
  })
})
