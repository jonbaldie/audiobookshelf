const chai = require('chai')
const expect = chai.expect
const SmartSpeedProcessorCore = require('../../../../client/players/smart-speed/SmartSpeedProcessorCore')

describe('SmartSpeedProcessorCore', () => {
  it('drops the compressed portion of a silence region', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })
    core.updateRegion(true, 400)

    const result = core.process(new Float32Array([0, 1, 2, 3, 4, 5]))

    expect(result.becameActive).to.equal(true)
    expect(result.isActive).to.equal(true)
    expect(result.droppedSamples).to.equal(6)
    expect(result.totalDroppedSamples).to.equal(6)
    expect(Array.from(result.output)).to.deep.equal([])
  })

  it('emits active then inactive transition events once', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })

    core.updateRegion(true, 300)
    const activeResult = core.process(new Float32Array([1, 2, 3]))
    const steadyResult = core.process(new Float32Array([4, 5, 6]))

    core.updateRegion(false, 100)
    const inactiveResult = core.process(new Float32Array([7, 8, 9]))

    expect(activeResult.becameActive).to.equal(true)
    expect(activeResult.becameInactive).to.equal(false)
    expect(steadyResult.becameActive).to.equal(false)
    expect(steadyResult.becameInactive).to.equal(false)
    expect(inactiveResult.becameActive).to.equal(false)
    expect(inactiveResult.becameInactive).to.equal(true)
    expect(inactiveResult.isActive).to.equal(false)
  })

  it('tracks cumulative dropped samples across multiple process calls', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })
    core.updateRegion(true, 408)

    const first = core.process(new Float32Array([0, 1, 2, 3]))
    const second = core.process(new Float32Array([4, 5, 6, 7]))
    const third = core.process(new Float32Array([8, 9, 10, 11]))

    expect(first.droppedSamples).to.equal(4)
    expect(first.totalDroppedSamples).to.equal(4)
    expect(second.droppedSamples).to.equal(4)
    expect(second.totalDroppedSamples).to.equal(8)
    expect(third.droppedSamples).to.equal(4)
    expect(third.totalDroppedSamples).to.equal(12)
    expect(Array.from(third.output)).to.deep.equal([])
  })

  it('does not activate for short silence regions below the debounce threshold', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2, minimumSilenceMs: 200 })
    core.updateRegion(true, 199)

    const result = core.process(new Float32Array([1, 2, 3]))

    expect(result.becameActive).to.equal(false)
    expect(result.droppedSamples).to.equal(0)
    expect(result.totalDroppedSamples).to.equal(0)
    expect(Array.from(result.output)).to.deep.equal([1, 2, 3])
  })
})
