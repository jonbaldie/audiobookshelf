const path = require("path")
const { defineConfig } = require("cypress")

module.exports = defineConfig({
  env: {
    ABS_CYPRESS_DEBUG_BROWSER: false
  },
  setupNodeEvents(on, config) {
    on('task', {
      absCypressDebug(payload) {
        const prefix = `[cypress:${payload.type}]`
        const message = typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message)
        const details = payload.details ? `\n${payload.details}` : ''

        // Surface browser-side failures in terminal output for focused debug runs.
        console.error(`${prefix} ${message}${details}`)
        return null
      }
    })

    on('before:browser:launch', (browser, launchOptions) => {
      if (!config.env.ABS_CYPRESS_DEBUG_BROWSER) {
        return launchOptions
      }

      if (browser.family === 'chromium') {
        launchOptions.args.push('--auto-open-devtools-for-tabs')
        launchOptions.args.push('--enable-logging=stderr')
        launchOptions.args.push('--v=1')
      }

      return launchOptions
    })

    return config
  },
  e2e: {
  },
  component: {
    devServer: {
      framework: "nuxt",
      bundler: "webpack"
    },
    specPattern: "cypress/tests/**/*.cy.js",
    supportFile: path.join(__dirname, 'cypress/support/component.js')
  }
})
