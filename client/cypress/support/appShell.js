import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import { Constants } from '@/plugins/constants'
import Strings from '@/strings/en-us.json'
import * as rootStore from '@/store'
import * as globalsStore from '@/store/globals'
import * as librariesStore from '@/store/libraries'
import * as userStore from '@/store/user'

Vue.use(VueRouter)
Vue.use(Vuex)

const DEFAULT_ROUTER_BASE_PATH = ''

const createModule = (module) => ({
  namespaced: true,
  state: module.state(),
  getters: module.getters,
  mutations: module.mutations,
  actions: module.actions
})

export const createAppShellLibrary = (overrides = {}) => ({
  id: 'library-1',
  name: 'Test Library',
  mediaType: 'book',
  provider: 'audible.us',
  displayOrder: 0,
  settings: {
    coverAspectRatio: Constants.BookCoverAspectRatio.STANDARD,
    audiobooksOnly: false,
    epubsAllowScriptedContent: false
  },
  ...overrides
})

export const createAppShellUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'cypress',
  type: 'admin',
  mediaProgress: [],
  bookmarks: [],
  librariesAccessible: [],
  permissions: {
    update: true,
    delete: true,
    download: true,
    upload: true,
    accessAllLibraries: true,
    accessExplicitContent: true
  },
  ...overrides
})

const createDefaultServices = (services = {}) => ({
  axios: services.axios || {
    $get: () => Promise.reject(new Error('No Cypress app-shell $axios.$get handler configured')),
    $post: () => Promise.reject(new Error('No Cypress app-shell $axios.$post handler configured')),
    $patch: () => Promise.reject(new Error('No Cypress app-shell $axios.$patch handler configured')),
    $delete: () => Promise.reject(new Error('No Cypress app-shell $axios.$delete handler configured'))
  },
  config: {
    routerBasePath: DEFAULT_ROUTER_BASE_PATH,
    ...(services.config || {})
  },
  download: services.download || (() => {}),
  eventBus: services.eventBus || new Vue(),
  socket: services.socket || {
    connected: true,
    auth: {},
    connect() {},
    disconnect() {},
    emit() {},
    off() {},
    on() {}
  },
  toast: services.toast || {
    clear() {},
    dismiss() {},
    error() {},
    info() {},
    success() {},
    warning() {}
  }
})

export const createAppShellStore = (options = {}) => {
  const library = createAppShellLibrary(options.library)
  const user = createAppShellUser(options.user)
  const rootState = rootStore.state()

  const store = new Vuex.Store({
    state: {
      ...rootState,
      routerBasePath: options.routerBasePath || DEFAULT_ROUTER_BASE_PATH
    },
    getters: rootStore.getters,
    mutations: rootStore.mutations,
    actions: rootStore.actions,
    modules: {
      globals: createModule(globalsStore),
      libraries: createModule(librariesStore),
      user: createModule(userStore)
    }
  })

  store.commit('setServerSettings', {
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm',
    bookshelfView: Constants.BookshelfView.DETAIL,
    homeBookshelfView: Constants.BookshelfView.DETAIL,
    ...(options.serverSettings || {})
  })
  store.commit('libraries/set', [library, ...(options.libraries || [])])
  store.commit('libraries/setCurrentLibrary', { id: options.currentLibraryId || library.id })
  store.commit('user/setUser', user)
  store.commit('user/setAccessToken', options.accessToken || 'cypress-token')

  if (options.userSettings) {
    store.commit('user/setSettings', {
      ...store.state.user.settings,
      ...options.userSettings
    })
  }

  return store
}

export const createAppShellRouter = (options = {}) => {
  const component = options.component || { template: '<div />' }
  const router = new VueRouter({
    mode: 'abstract',
    routes: options.routes || [
      {
        path: '/',
        component
      },
      {
        path: '/library/:library',
        component
      },
      {
        path: '/item/:id',
        component
      },
      {
        path: '*',
        component
      }
    ]
  })

  router.push(options.route || '/')
  return router
}

const registerComponents = (components = {}) => {
  Object.entries(components).forEach(([name, component]) => {
    Vue.component(name, component)
  })
}

export const mountAppShell = (component, options = {}) => {
  const services = createDefaultServices(options.services)
  const store = options.store || createAppShellStore({
    ...options,
    routerBasePath: services.config.routerBasePath
  })
  const router = options.router || createAppShellRouter({
    route: options.route,
    routes: options.routes,
    component
  })

  registerComponents(options.components)

  Vue.prototype.$axios = services.axios
  Vue.prototype.$config = services.config
  Vue.prototype.$constants = Constants
  Vue.prototype.$download = services.download
  Vue.prototype.$eventBus = services.eventBus
  Vue.prototype.$strings = Strings
  Vue.prototype.$toast = services.toast

  store.$axios = services.axios
  store.$eventBus = services.eventBus

  return cy.mount(
    {
      name: 'CypressAppShell',
      components: {
        RoutedPage: component
      },
      router,
      store,
      data() {
        return {
          socket: services.socket
        }
      },
      template: '<routed-page />'
    },
    {
      router,
      store,
      mocks: {
        $axios: services.axios,
        $config: services.config,
        $constants: Constants,
        $download: services.download,
        $eventBus: services.eventBus,
        $strings: Strings,
        $toast: services.toast,
        ...(options.mocks || {})
      },
      ...(options.mountOptions || {})
    }
  )
}
