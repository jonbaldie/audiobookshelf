import NarratorCard from '@/components/cards/NarratorCard.vue'

describe('<NarratorCard />', () => {
  const narrator = {
    name: 'John Doe',
    numBooks: 5
  }
  const mocks = {
    $store: {
      getters: {
        'user/getUserCanUpdate': true,
        'user/getSizeMultiplier': 1
      },
      state: {
        libraries: {
          currentLibraryId: 'library-123'
        }
      }
    }
  }
  const stubs = {
    'nuxt-link': {
      props: ['to'],
      template: '<a :href="to"><slot /></a>'
    }
  }

  const mountCard = (propsData = { narrator }) => {
    cy.mount(NarratorCard, { propsData, mocks, stubs })
  }

  it('renders the narrator name, book count, and library link', () => {
    mountCard()

    cy.get('&name').should('have.text', 'John Doe')
    cy.get('&numBooks').should('have.text', '5 Books')
    cy.get('a').should('have.attr', 'href', '/library/library-123/bookshelf?filter=narrators.Sm9obiBEb2U%3D')
  })

  it('renders singular book text and falls back to narrator books length', () => {
    mountCard({ narrator: { name: 'Jane Doe', books: [{}, {}] } })

    cy.get('&name').should('have.text', 'Jane Doe')
    cy.get('&numBooks').should('have.text', '2 Books')

    mountCard({ narrator: { name: 'John Doe', numBooks: 1 } })

    cy.get('&numBooks').should('have.text', '1 Book')
  })

  it('renders safe defaults when narrator data is missing', () => {
    mountCard({})

    cy.get('&name').should('have.text', '')
    cy.get('&numBooks').should('have.text', '0 Books')
    cy.get('a').should('have.attr', 'href', '/library/library-123/bookshelf?filter=narrators.')
  })
})
