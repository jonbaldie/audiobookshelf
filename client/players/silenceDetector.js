/**
 * Scans a PCM buffer for runs of low-amplitude samples (“silences”) and returns their intervals in seconds.
 *
 * @param {Float32Array} samples       PCM data window
 * @param {number}        sampleRate    samples per second (e.g. 48000)
 * @param {number}        thresholdDb   silence threshold in decibels (e.g. -50)
 * @param {number}        minSilenceSec minimum continuous silence duration in seconds (e.g. 0.5)
 * @returns {Array<{start:number,end:number}>} list of silence intervals in seconds
 */
export function detectSilences(samples, sampleRate, thresholdDb, minSilenceSec) {
  const thresholdLin = Math.pow(10, thresholdDb / 20)
  const minSilenceSamples = Math.floor(minSilenceSec * sampleRate)
  const intervals = []
  let runStart = null

  for (let i = 0; i < samples.length; i++) {
    const amp = Math.abs(samples[i])
    if (amp <= thresholdLin) {
      if (runStart === null) runStart = i
    } else if (runStart !== null) {
      const runLength = i - runStart
      if (runLength >= minSilenceSamples) {
        intervals.push({
          start: runStart / sampleRate,
          end: i / sampleRate,
        })
      }
      runStart = null
    }
  }

  // handle trailing silence at end of buffer
  if (runStart !== null && (samples.length - runStart) >= minSilenceSamples) {
    intervals.push({
      start: runStart / sampleRate,
      end: samples.length / sampleRate,
    })
  }

  return intervals
}