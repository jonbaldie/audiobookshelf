import BookmarkItem from '@/components/modals/bookmarks/BookmarkItem.vue'

describe('BookmarkItem', () => {
  const bookmark = {
    id: 'bm-1',
    libraryItemId: 'li-1',
    title: 'Chapter note',
    time: 3661
  }

  it('renders the stored wall-clock bookmark time directly', () => {
    cy.mount(BookmarkItem, {
      propsData: {
        bookmark,
        playbackRate: 1.75
      },
      mocks: {
        $axios: {
          $patch: cy.stub().resolves()
        },
        $toast: {
          error: cy.stub()
        }
      }
    })

    cy.contains('01:01:01').should('be.visible')
    cy.contains('00:34:52').should('not.exist')
    cy.contains('Chapter note').should('be.visible')
  })
})
