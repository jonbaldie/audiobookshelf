import LazyBookCard from '@/components/cards/LazyBookCard'
import Tooltip from '@/components/ui/Tooltip.vue'
import ExplicitIndicator from '@/components/widgets/ExplicitIndicator.vue'
import LoadingSpinner from '@/components/widgets/LoadingSpinner.vue'
import { Constants } from '@/plugins/constants'
import { mountAppShell } from '../../support/appShell'

const libraryItem = {
  id: 'book-1',
  libraryId: 'library-1',
  mediaType: 'book',
  updatedAt: 1700000000000,
  media: {
    id: 'media-1',
    coverPath: null,
    metadata: {
      title: 'The Hobbit',
      titleIgnorePrefix: 'Hobbit',
      authorName: 'J. R. R. Tolkien',
      subtitle: 'There and Back Again'
    },
    numTracks: 1
  }
}

const RouteProbe = {
  template: '<p cy-id="routePath">{{ $route.path }}</p>'
}

const RoutedBookshelfSmoke = {
  components: { LazyBookCard, RouteProbe },
  template: `
    <main>
      <route-probe />
      <lazy-book-card
        :index="0"
        :book-mount="libraryItem"
        :bookshelf-view="bookshelfView"
        :continue-listening-shelf="false"
        :filter-by="null"
        :sorting-ignore-prefix="false"
        :order-by="null"
      />
    </main>
  `,
  data() {
    return {
      libraryItem,
      bookshelfView: Constants.BookshelfView.DETAIL
    }
  }
}

describe('routed app-shell harness', () => {
  it('mounts a routed bookshelf card flow with real store and router state', () => {
    mountAppShell(RoutedBookshelfSmoke, {
      route: '/library/library-1',
      components: {
        'ui-tooltip': Tooltip,
        'widgets-explicit-indicator': ExplicitIndicator,
        'widgets-loading-spinner': LoadingSpinner
      }
    })

    cy.get('&routePath').should('have.text', '/library/library-1')
    cy.get('&coverImage').should('have.attr', 'src').and('include', '/book_placeholder.jpg')
    cy.get('&title').should('have.text', 'The Hobbit')
    cy.get('#book-card-0').click()
    cy.get('&routePath').should('have.text', '/item/book-1')
  })
})
