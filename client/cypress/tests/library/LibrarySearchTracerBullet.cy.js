import BookShelfCategorized from '@/components/app/BookShelfCategorized.vue'
import BookShelfRow from '@/components/app/BookShelfRow.vue'
import GlobalSearch from '@/components/controls/GlobalSearch.vue'
import LazyBookCard from '@/components/cards/LazyBookCard.vue'
import AuthorCard from '@/components/cards/AuthorCard.vue'
import TextInput from '@/components/ui/TextInput.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import ExplicitIndicator from '@/components/widgets/ExplicitIndicator.vue'
import LoadingSpinner from '@/components/widgets/LoadingSpinner.vue'
import { mountAppShell } from '../../support/appShell'

const TEST_LIBRARY_ID = 'lib-search-tracer'
const TEST_ITEM_ID = 'item-search-tracer'

const libraryItem = {
  id: TEST_ITEM_ID,
  libraryId: TEST_LIBRARY_ID,
  mediaType: 'book',
  updatedAt: 1714608000000,
  isFile: false,
  isMissing: false,
  isInvalid: false,
  media: {
    id: 'media-search-tracer',
    coverPath: null,
    duration: 3600,
    tags: [],
    audioFiles: [{ index: 0, ino: 'audio-file-1', metadata: { path: '/library/the-tracer-bullet.mp3', ext: 'mp3' } }],
    tracks: [{ index: 0, startOffset: 0, duration: 3600, title: 'Part 1', metadata: { path: '/library/the-tracer-bullet.mp3', ext: 'mp3' } }],
    chapters: [{ id: 'chapter-1', start: 0, end: 3600, title: 'Chapter 1' }],
    metadata: {
      title: 'The Tracer Bullet',
      titleIgnorePrefix: 'Tracer Bullet',
      subtitle: 'A Search Harness Story',
      author: 'Casey Searcher',
      authorName: 'Casey Searcher',
      authors: [{ id: 'author-search-tracer', name: 'Casey Searcher' }],
      series: [{ id: 'series-search-tracer', name: 'Harness Cases', sequence: '1' }],
      narrators: ['Morgan Voice'],
      explicit: false,
      abridged: false,
      description: 'Fixture item used for search tracer-bullet coverage.'
    }
  },
  libraryFiles: []
}

const searchPayload = {
  book: [{ libraryItem }],
  authors: [{ id: 'author-search-tracer', name: 'Casey Searcher', numBooks: 1 }],
  series: [{ series: { id: 'series-search-tracer', name: 'Harness Cases', nameIgnorePrefix: 'Harness Cases' }, books: [libraryItem] }],
  podcast: [],
  episodes: [],
  tags: [],
  genres: [],
  narrators: []
}

const RouteProbe = {
  template: '<p cy-id="routePath">{{ $route.fullPath }}</p>'
}

const LibrarySearchFlow = {
  components: { GlobalSearch, BookShelfCategorized, RouteProbe },
  data() {
    return {
      query: '',
      results: {
        podcasts: [],
        episodes: [],
        books: [],
        authors: [],
        series: [],
        tags: [],
        narrators: []
      }
    }
  },
  computed: {
    hasResults() {
      return Object.values(this.results).some((result) => result.length)
    }
  },
  watch: {
    '$route.fullPath': {
      immediate: true,
      handler() {
        if (this.$route.path !== `/library/${TEST_LIBRARY_ID}/search`) return
        if (!this.$route.query.q || this.$route.query.q === this.query) return

        this.query = this.$route.query.q
        this.search()
      }
    }
  },
  methods: {
    async search() {
      const payload = await this.$axios.$get(`/api/libraries/${TEST_LIBRARY_ID}/search?q=${encodeURIComponent(this.query)}`)
      this.results = {
        podcasts: payload.podcast || [],
        episodes: payload.episodes || [],
        books: payload.book || [],
        authors: payload.authors || [],
        series: payload.series || [],
        tags: payload.tags || [],
        narrators: payload.narrators || []
      }

      this.$nextTick(() => {
        this.$refs.bookshelf?.setShelvesFromSearch()
      })
    }
  },
  template: `
    <main class="p-4">
      <route-probe />
      <controls-global-search />
      <p v-if="query" cy-id="searchQuery">Search results for {{ query }}</p>
      <app-book-shelf-categorized v-if="hasResults" ref="bookshelf" search :results="results" />
    </main>
  `
}

describe('Library Search Tracer Bullet (audiobookshelf-yo4)', () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
  })

  it('covers search input, grouped results, and opening an item detail route', () => {
    mountAppShell(LibrarySearchFlow, {
      route: `/library/${TEST_LIBRARY_ID}`,
      library: {
        id: TEST_LIBRARY_ID,
        name: 'Tracer Library',
        provider: 'google'
      },
      serverSettings: {
        bookshelfView: 0,
        homeBookshelfView: 0
      },
      currentLibraryId: TEST_LIBRARY_ID,
      routes: [
        { path: '/library/:library', component: LibrarySearchFlow },
        { path: '/library/:library/search', component: LibrarySearchFlow },
        { path: '/item/:id', component: LibrarySearchFlow }
      ],
      services: {
        axios: {
          $get: () => Promise.resolve(searchPayload),
          $post: () => Promise.reject(new Error('Unexpected POST in library search tracer bullet')),
          $patch: () => Promise.reject(new Error('Unexpected PATCH in library search tracer bullet')),
          $delete: () => Promise.reject(new Error('Unexpected DELETE in library search tracer bullet'))
        }
      },
      components: {
        'app-book-shelf-categorized': BookShelfCategorized,
        'app-book-shelf-row': BookShelfRow,
        'cards-lazy-book-card': LazyBookCard,
        'cards-author-card': AuthorCard,
        'controls-global-search': GlobalSearch,
        'ui-text-input': TextInput,
        'ui-tooltip': Tooltip,
        'widgets-explicit-indicator': ExplicitIndicator,
        'widgets-loading-spinner': LoadingSpinner,
        'widgets-cover-size-widget': { template: '<div />' },
        'cards-lazy-series-card': { props: ['seriesMount'], template: '<div class="series-card">{{ seriesMount.name }}</div>' },
        'cards-narrator-card': { template: '<div />' },
        'cards-group-card': { template: '<div />' },
        'covers-author-image': { template: '<div />' },
        'covers-book-cover': { template: '<div />' },
        'ui-context-menu-dropdown': { template: '<div />' }
      }
    })

    cy.get('&routePath').should('have.text', `/library/${TEST_LIBRARY_ID}`)
    cy.get('input[placeholder="Search.."]').type('tracer{enter}')
    cy.get('&routePath').should('have.text', `/library/${TEST_LIBRARY_ID}/search?q=tracer`)
    cy.get('&searchQuery').should('have.text', 'Search results for tracer')

    cy.contains('Books').should('be.visible')
    cy.contains('Authors').should('be.visible')
    cy.contains('Series').should('be.visible')
    cy.get('&placeholderTitleText').should('have.text', 'The Tracer Bullet')
    cy.contains('Casey Searcher').should('be.visible')

    cy.get('#book-card-0').click()
    cy.get('&routePath').should('have.text', `/item/${TEST_ITEM_ID}`)
  })
})
