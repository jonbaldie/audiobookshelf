const chai = require('chai')
const expect = chai.expect

describe('Smart Speed boundary smoothing contract', () => {
  it('documents the compressor-facing semantics that audiobookshelf-eim must implement')

  describe.skip('pending compressor boundary smoothing implementation', () => {
    const SAMPLE_RATE = 48000
    const CROSSFADE_SAMPLES = 128

    const createBoundaryFixture = () => {
      const speechBefore = new Float32Array(CROSSFADE_SAMPLES).fill(0.75)
      const silence = new Float32Array(CROSSFADE_SAMPLES * 4).fill(0)
      const speechAfter = new Float32Array(CROSSFADE_SAMPLES).fill(0.75)

      return {
        input: concatenate([speechBefore, silence, speechAfter]),
        silenceRange: {
          startSample: speechBefore.length,
          endSample: speechBefore.length + silence.length
        },
        expectedRemovedSamples: silence.length,
        expectedCrossfadeSamples: CROSSFADE_SAMPLES,
        sampleRate: SAMPLE_RATE
      }
    }

    const concatenate = (parts) => {
      const length = parts.reduce((sum, part) => sum + part.length, 0)
      const combined = new Float32Array(length)
      let offset = 0

      parts.forEach((part) => {
        combined.set(part, offset)
        offset += part.length
      })

      return combined
    }

    const maxDeltaBetweenAdjacentSamples = (samples) => {
      let maxDelta = 0
      for (let i = 1; i < samples.length; i++) {
        maxDelta = Math.max(maxDelta, Math.abs(samples[i] - samples[i - 1]))
      }
      return maxDelta
    }

    const takeWindowAroundBoundary = (samples, boundaryIndex, radius) => {
      return samples.slice(boundaryIndex - radius, boundaryIndex + radius)
    }

    it('crossfades speech across a removed silence region instead of introducing a hard step', () => {
      const fixture = createBoundaryFixture()
      const output = applyBoundarySmoothing(fixture)

      expect(output.removedSamples).to.equal(fixture.expectedRemovedSamples)
      expect(output.crossfadeSamples).to.equal(fixture.expectedCrossfadeSamples)

      const boundaryWindow = takeWindowAroundBoundary(
        output.samples,
        fixture.silenceRange.startSample,
        fixture.expectedCrossfadeSamples
      )

      expect(maxDeltaBetweenAdjacentSamples(boundaryWindow)).to.be.below(0.75)
      expect(output.samples[fixture.silenceRange.startSample - 1]).to.be.above(0)
      expect(output.samples[fixture.silenceRange.startSample]).to.be.above(0)
    })

    it('preserves identity when no silence is removed so smoothing cannot color normal speech', () => {
      const input = new Float32Array([0.1, 0.2, 0.3, 0.4])
      const output = applyBoundarySmoothing({
        input,
        silenceRange: { startSample: 2, endSample: 2 },
        expectedRemovedSamples: 0,
        expectedCrossfadeSamples: 0,
        sampleRate: SAMPLE_RATE
      })

      expect(Array.from(output.samples)).to.deep.equal(Array.from(input))
      expect(output.removedSamples).to.equal(0)
      expect(output.crossfadeSamples).to.equal(0)
    })
  })
})
