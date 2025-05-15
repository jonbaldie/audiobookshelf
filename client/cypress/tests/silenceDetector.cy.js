import { detectSilences } from '../../players/silenceDetector.js'

describe('silenceDetector', () => {
  it('detects two 1s silences in a 5s stream', () => {
    const sampleRate = 1000
    const bufferLength = 5 * sampleRate
    const samples = new Float32Array(bufferLength).fill(0.5)

    // carve out two 1-second silences
    samples.fill(0, 1 * sampleRate, 2 * sampleRate)
    samples.fill(0, 3 * sampleRate, 4 * sampleRate)

    const intervals = detectSilences(samples, sampleRate, -50, 0.5)
    expect(intervals).to.deep.equal([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
    ])
  })

  it('returns empty array when no silence meets duration threshold', () => {
    const sampleRate = 1000
    const samples = new Float32Array(2 * sampleRate).fill(0)
    // only 2s of silence but threshold is 3s
    const intervals = detectSilences(samples, sampleRate, -50, 3)
    expect(intervals).to.deep.equal([])
  })
})