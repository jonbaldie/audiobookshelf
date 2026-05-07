// Import the necessary dependencies
import AuthorCard from '@/components/cards/AuthorCard.vue'
import AuthorImage from '@/components/covers/AuthorImage.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import LoadingSpinner from '@/components/widgets/LoadingSpinner.vue'

describe('AuthorCard', () => {
  const authorMount = {
    id: 1,
    name: 'John Doe',
    numBooks: 5
  }

  const propsData = {
    authorMount,
    nameBelow: false
  }

  const mocks = {
    $strings: {
      LabelBooks: 'Books',
      ButtonQuickMatch: 'Quick Match',
      ToastAuthorUpdateSuccess: 'Author updated',
      ToastAuthorUpdateSuccessNoImageFound: 'Author updated (no image found)',
      ToastNoUpdatesNecessary: 'No updates necessary'
    },
    $toast: {
      success: () => {},
      error: () => {},
      info: () => {}
    },
    $config: {
      routerBasePath: ''
    },
    $store: {
      getters: {
        'user/getUserCanUpdate': true,
        'libraries/getLibraryProvider': () => 'audible.us',
        'user/getSizeMultiplier': 1
      },
      state: {
        libraries: {
          currentLibraryId: 'library-123'
        }
      }
    },
    $eventBus: {
      $on: () => {},
      $off: () => {}
    }
  }

  const stubs = {
    'covers-author-image': AuthorImage,
    'ui-tooltip': Tooltip,
    'widgets-loading-spinner': LoadingSpinner
  }

  const mountOptions = { propsData, mocks, stubs }

  it('renders the component', () => {
    cy.mount(AuthorCard, mountOptions)

    cy.get('&textInline').should('be.visible')
    cy.get('&match').should('be.hidden')
    cy.get('&edit').should('be.hidden')
    cy.get('&nameBelow').should('be.hidden')
    cy.get('&card').should(($el) => {
      const width = $el.width()
      const height = $el.height()
      const defaultHeight = 192
      const defaultWidth = defaultHeight * 0.8
      expect(width).to.be.closeTo(defaultWidth, 0.01)
      expect(height).to.be.closeTo(defaultHeight, 0.01)
    })
  })

  it('renders the component with the author name below', () => {
    const updatedPropsData = { ...propsData, nameBelow: true }
    cy.mount(AuthorCard, { ...mountOptions, propsData: updatedPropsData })

    cy.get('&textInline').should('be.hidden')
    cy.get('&match').should('be.hidden')
    cy.get('&edit').should('be.hidden')
    let nameBelowHeight
    cy.get('&nameBelow')
      .should('be.visible')
      .and('have.text', 'John Doe')
      .and(($el) => {
        const height = $el.height()
        const width = $el.width()
        const sizeMultiplier = 1
        const defaultFontSize = 16
        const defaultLineHeight = 1.5
        const fontSizeMultiplier = 0.75
        const px2 = 16
        const defaultHeight = 192
        const defaultWidth = defaultHeight * 0.8
        expect(height).to.be.closeTo(defaultFontSize * fontSizeMultiplier * sizeMultiplier * defaultLineHeight, 0.01)
        nameBelowHeight = height
        expect(width).to.be.closeTo(defaultWidth - px2, 0.01)
      })
    cy.get('&card').should(($el) => {
      const width = $el.width()
      const height = $el.height()
      const py1 = 8
      const defaultHeight = 192
      const defaultWidth = defaultHeight * 0.8
      expect(width).to.be.closeTo(defaultWidth, 0.01)
      expect(height).to.be.closeTo(defaultHeight + nameBelowHeight + py1, 0.01)
    })
  })

  it('renders quick-match and edit buttons on mouse hover', () => {
    cy.mount(AuthorCard, mountOptions)

    // before mouseover
    cy.get('&match').should('be.hidden')
    cy.get('&edit').should('be.hidden')
    // after mouseover
    cy.get('&card').trigger('mouseover')
    cy.get('&match').should('be.visible')
    cy.get('&edit').should('be.visible')
    // after mouseleave
    cy.get('&card').trigger('mouseleave')
    cy.get('&match').should('be.hidden')
    cy.get('&edit').should('be.hidden')
  })

  it('renders the component with spinner while searching', () => {
    const data = () => {
      return { searching: true, isHovering: false }
    }
    cy.mount(AuthorCard, { ...mountOptions, data })

    cy.get('&textInline').should('be.hidden')
    cy.get('&match').should('be.hidden')
    cy.get('&edit').should('be.hidden')
    cy.get('&spinner').should('be.visible')
  })

  it('keeps the current author details visible when quick match returns no updates', () => {
    const updatedMocks = {
      ...mocks,
      $axios: {
        $post: cy.stub().resolves({ updated: false, author: { ...authorMount, name: 'Unused Match Result', imagePath: 'path/to/unused-image' } })
      }
    }
    cy.mount(AuthorCard, { ...mountOptions, mocks: updatedMocks })
    cy.get('&card').trigger('mouseover')
    cy.get('&match').click()

    cy.get('&spinner').should('be.hidden')
    cy.get('&textInline').should('contain.text', 'John Doe')
    cy.get('&textInline').should('not.contain.text', 'Unused Match Result')
    cy.get('&imageArea').find('img').should('not.exist')
  })

  it('shows the matched author details when quick match updates without an image', () => {
    const updatedAuthor = { ...authorMount, name: 'John Doe Matched', asin: 'B00MATCHED' }
    const updatedMocks = {
      ...mocks,
      $axios: {
        $post: cy.stub().resolves({ updated: true, author: updatedAuthor })
      }
    }
    cy.mount(AuthorCard, { ...mountOptions, mocks: updatedMocks })
    cy.get('&card').trigger('mouseover')
    cy.get('&match').click()

    cy.get('&spinner').should('be.hidden')
    cy.get('&textInline').should('contain.text', 'John Doe Matched')
    cy.get('&imageArea').find('img').should('not.exist')
    cy.get('&match').should('be.visible')
  })

  it('shows the matched author details and image when quick match updates with an image', () => {
    const updatedAuthor = { ...authorMount, name: 'John Doe Matched With Image', imagePath: 'path/to/image', updatedAt: 123, asin: 'B00MATCHED' }
    const updatedMocks = {
      ...mocks,
      $axios: {
        $post: cy.stub().resolves({ updated: true, author: updatedAuthor })
      }
    }
    cy.intercept('GET', '/api/authors/1/image?ts=123', { fixture: 'images/cover1.jpg' })
    cy.mount(AuthorCard, { ...mountOptions, mocks: updatedMocks })
    cy.get('&card').trigger('mouseover')
    cy.get('&match').click()

    cy.get('&spinner').should('be.hidden')
    cy.get('&textInline').should('contain.text', 'John Doe Matched With Image')
    cy.get('&imageArea')
      .find('img')
      .should('be.visible')
      .and('have.attr', 'src', '/api/authors/1/image?ts=123')
    cy.get('&match').should('be.visible')
  })
})
