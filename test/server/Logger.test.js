const { expect } = require('chai')
const sinon = require('sinon')
const Logger = require('../../server/Logger')
const { LogLevel } = require('../../server/utils/constants')
const date = require('../../server/libs/dateAndTime')
const util = require('util')

describe('Logger', function () {
  let originalLogLevel
  let originalLogManager
  let originalSocketListeners
  let consoleOutput
  let logRecords

  beforeEach(function () {
    originalLogLevel = Logger.logLevel
    originalLogManager = Logger.logManager
    originalSocketListeners = [...Logger.socketListeners]

    consoleOutput = []
    logRecords = []

    sinon.stub(date, 'format').returns('2024-09-10 12:34:56.789')
    sinon.stub(Logger, 'source').get(() => 'some/source.js')

    for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'log']) {
      sinon.stub(console, method).callsFake((...args) => {
        consoleOutput.push({ method, args })
      })
    }

    Logger.logManager = {
      logToFile: sinon.stub().callsFake(async (record) => {
        logRecords.push(record)
      })
    }
    Logger.socketListeners = []
  })

  afterEach(function () {
    Logger.logLevel = originalLogLevel
    Logger.logManager = originalLogManager
    Logger.socketListeners = originalSocketListeners
    sinon.restore()
  })

  function expectSingleRecord({ method, levelName, level, message, consoleArgs }) {
    expect(consoleOutput).to.have.lengthOf(1)
    expect(consoleOutput[0]).to.deep.equal({
      method,
      args: [`[2024-09-10 12:34:56.789] ${levelName}:`, ...consoleArgs]
    })

    expect(logRecords).to.deep.equal([
      {
        timestamp: '2024-09-10 12:34:56.789',
        source: 'some/source.js',
        message,
        levelName,
        level
      }
    ])
  }

  describe('logging methods', function () {
    it('exposes a method for each defined log level', function () {
      const loggerMethods = Object.keys(LogLevel).map((key) => key.toLowerCase())

      loggerMethods.forEach((method) => {
        expect(Logger).to.have.property(method).that.is.a('function')
      })
    })

    it('emits the expected record for each log level', async function () {
      const scenarios = [
        { method: 'trace', consoleMethod: 'trace', levelName: 'TRACE', level: LogLevel.TRACE },
        { method: 'debug', consoleMethod: 'debug', levelName: 'DEBUG', level: LogLevel.DEBUG },
        { method: 'info', consoleMethod: 'info', levelName: 'INFO', level: LogLevel.INFO },
        { method: 'warn', consoleMethod: 'warn', levelName: 'WARN', level: LogLevel.WARN },
        { method: 'error', consoleMethod: 'error', levelName: 'ERROR', level: LogLevel.ERROR },
        { method: 'fatal', consoleMethod: 'error', levelName: 'FATAL', level: LogLevel.FATAL },
        { method: 'note', consoleMethod: 'log', levelName: 'NOTE', level: LogLevel.NOTE }
      ]

      Logger.logLevel = LogLevel.TRACE

      for (const scenario of scenarios) {
        consoleOutput = []
        logRecords = []

        await Logger[scenario.method]('Test message')

        expectSingleRecord({
          method: scenario.consoleMethod,
          levelName: scenario.levelName,
          level: scenario.level,
          message: 'Test message',
          consoleArgs: ['Test message']
        })
      }
    })
  })

  describe('#log', function () {
    it('suppresses logs below the configured threshold', async function () {
      Logger.logLevel = LogLevel.ERROR

      await Logger.debug('This log should not appear')

      expect(consoleOutput).to.deep.equal([])
      expect(logRecords).to.deep.equal([])
    })

    it('emits log records only to listeners whose threshold allows them', async function () {
      const socket1 = { id: '1', emit: sinon.spy() }
      const socket2 = { id: '2', emit: sinon.spy() }

      Logger.addSocketListener(socket1, LogLevel.DEBUG)
      Logger.addSocketListener(socket2, LogLevel.ERROR)
      Logger.logLevel = LogLevel.TRACE

      await Logger.debug('Socket test')

      expect(logRecords).to.have.lengthOf(1)
      expect(socket1.emit.calledOnceWithExactly('log', logRecords[0])).to.be.true
      expect(socket2.emit.called).to.be.false
    })

    it('persists fatal and note records even when the logger threshold is higher', async function () {
      Logger.logLevel = LogLevel.NOTE + 1

      await Logger.fatal('Fatal error')
      expectSingleRecord({
        method: 'error',
        levelName: 'FATAL',
        level: LogLevel.FATAL,
        message: 'Fatal error',
        consoleArgs: ['Fatal error']
      })

      consoleOutput = []
      logRecords = []

      await Logger.note('Note message')
      expectSingleRecord({
        method: 'log',
        levelName: 'NOTE',
        level: LogLevel.NOTE,
        message: 'Note message',
        consoleArgs: ['Note message']
      })
    })

    it('stringifies non-string arguments in persisted records', async function () {
      const obj = { key: 'value' }
      Logger.logLevel = LogLevel.TRACE

      await Logger.debug('Logging object:', obj)

      expectSingleRecord({
        method: 'debug',
        levelName: 'DEBUG',
        level: LogLevel.DEBUG,
        message: `Logging object: ${util.inspect(obj)}`,
        consoleArgs: ['Logging object:', obj]
      })
    })
  })

  describe('socket listeners', function () {
    it('replaces duplicate listeners and removes them by id', function () {
      const socket1 = { id: '1', emit: sinon.spy() }
      const socket1Replacement = { id: '1', emit: sinon.spy() }
      const socket2 = { id: '2', emit: sinon.spy() }

      Logger.addSocketListener(socket1, LogLevel.DEBUG)
      Logger.addSocketListener(socket1Replacement, LogLevel.ERROR)
      Logger.addSocketListener(socket2, LogLevel.ERROR)
      Logger.removeSocketListener('1')

      expect(Logger.socketListeners).to.deep.equal([
        {
          id: '2',
          socket: socket2,
          level: LogLevel.ERROR
        }
      ])
    })
  })

  describe('setLogLevel', function () {
    it('changes the log level without persisting a suppressed transition message', async function () {
      Logger.logLevel = LogLevel.TRACE

      await Logger.setLogLevel(LogLevel.WARN)

      expect(Logger.logLevel).to.equal(LogLevel.WARN)
      expect(consoleOutput).to.deep.equal([])
      expect(logRecords).to.deep.equal([])
    })
  })
})
