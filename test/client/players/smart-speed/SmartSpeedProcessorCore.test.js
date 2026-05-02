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
    const inactiveResult = core.process(new Float32Array(new Array(147).fill(0)))
    const postInactiveResult = core.process(new Float32Array([4, 5, 6]))

    expect(activeResult.becameActive).to.equal(true)
    expect(activeResult.becameInactive).to.equal(false)
    expect(inactiveResult.becameInactive).to.equal(true)
    expect(inactiveResult.becameActive).to.equal(false)
    expect(inactiveResult.isActive).to.equal(false)
    expect(postInactiveResult.becameInactive).to.equal(false)
  })

  it('delays becameInactive until pending drops are fully consumed', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })

    core.updateRegion(true, 300)
    const activeResult = core.process(new Float32Array([1, 2, 3]))
    const partialDrainResult = core.process(new Float32Array([4, 5, 6]))

    core.updateRegion(false, 100)
    const drainingResult = core.process(new Float32Array([7, 8, 9]))
    const inactiveResult = core.process(new Float32Array(new Array(141).fill(0)))
    const postInactiveResult = core.process(new Float32Array([10, 11, 12]))

    expect(activeResult.becameActive).to.equal(true)
    expect(partialDrainResult.droppedSamples).to.equal(3)
    expect(drainingResult.droppedSamples).to.equal(3)
    expect(drainingResult.becameInactive).to.equal(false)
    expect(drainingResult.isActive).to.equal(true)
    expect(inactiveResult.droppedSamples).to.equal(141)
    expect(inactiveResult.becameInactive).to.equal(true)
    expect(inactiveResult.isActive).to.equal(false)
    expect(postInactiveResult.droppedSamples).to.equal(0)
    expect(postInactiveResult.becameInactive).to.equal(false)
  })

  it('accumulates pending drop budget across repeated silence updates', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })

    core.updateRegion(true, 300)
    core.updateRegion(true, 300)

    const first = core.process(new Float32Array([0, 1, 2, 3, 4, 5]))
    const second = core.process(new Float32Array([6, 7, 8, 9, 10, 11]))
    const third = core.process(new Float32Array([12, 13, 14, 15, 16, 17]))

    expect(first.droppedSamples).to.equal(6)
    expect(second.droppedSamples).to.equal(6)
    expect(third.droppedSamples).to.equal(6)
    expect(third.totalDroppedSamples).to.equal(18)
    expect(third.isActive).to.equal(true)
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

  it('does not overdrop when overlapping silence updates are clamped to a monotonic stream', () => {
    const core = new SmartSpeedProcessorCore({ sampleRate: 1000, compressionRatio: 2 })

    core.updateRegion(true, 1000)
    core.updateRegion(true, 500)

    const result = core.process(new Float32Array(new Array(800).fill(0)))

    expect(result.droppedSamples).to.equal(750)
    expect(result.totalDroppedSamples).to.equal(750)
    expect(result.isActive).to.equal(false)
  })
})
