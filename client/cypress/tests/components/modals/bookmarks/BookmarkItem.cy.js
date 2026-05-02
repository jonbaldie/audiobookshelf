import BookmarkItem from '@/components/modals/bookmarks/BookmarkItem.vue'

describe('<BookmarkItem />', () => {
  const propsData = {
    bookmark: {
      id: 'bookmark-1',
      time: 120,
      title: 'Checkpoint'
    },
    playbackRate: 2
  }

  const mocks = {
    $secondsToTimestamp: (seconds) => `${seconds}s`
  }

  it('renders bookmark timestamps in wall-clock time', () => {
    cy.mount(BookmarkItem, { propsData, mocks })

    cy.contains('120s').should('be.visible')
    cy.contains('60s').should('not.exist')
  })
})
