class SilenceCompressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.regions = []
    this.ratio = 1.0
    this.totalCompressedMs = 0
    this.rampDurationSec = 0.005 // 5ms
    
    this.port.onmessage = (event) => {
      const msg = event.data
      if (msg.type === 'set-regions') {
        this.regions = msg.regions.filter(r => (r.end - r.start) >= 200)
      } else if (msg.type === 'set-ratio') {
        this.ratio = msg.value
      }
    }
  }

  getActiveRegion(timeMs) {
    for (const r of this.regions) {
      if (timeMs >= r.start && timeMs <= r.end) return r
    }
    return null
  }

  calculateRampGain(timeMs, region) {
    const rampMs = this.rampDurationSec * 1000
    
    // Entry ramp (0 -> 1)
    if (timeMs - region.start < rampMs) {
      return (timeMs - region.start) / rampMs
    }
    
    // Exit ramp (1 -> 0)
    if (region.end - timeMs < rampMs) {
      return (region.end - timeMs) / rampMs
    }
    
    return 1.0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    
    if (!input || !input.length || !output || !output.length) return true

    const numChannels = input.length
    const numFrames = input[0].length
    const sampleRateC = typeof sampleRate !== 'undefined' ? sampleRate : 48000
    // Use currentTime if available, otherwise fallback to 0 (for tests)
    const currentTimeSec = typeof currentTime !== 'undefined' ? currentTime : 0
    
    let outputIndex = 0
    let inputIndex = 0
    let savedSecThisBlock = 0
    
    while (inputIndex < numFrames) {
      const sampleTimeSec = currentTimeSec + (inputIndex / sampleRateC)
      const sampleTimeMs = sampleTimeSec * 1000
      
      const region = this.getActiveRegion(sampleTimeMs)
      
      let step = 1.0
      let rampGain = 1.0
      
      if (region && this.ratio > 1.0) {
        step = this.ratio
        rampGain = this.calculateRampGain(sampleTimeMs, region)
      }
      
      // If taking this step exceeds the input buffer, we must stop
      if (inputIndex >= numFrames) break
      
      const intIndex = Math.floor(inputIndex)
      const frac = inputIndex - intIndex
      
      for (let c = 0; c < numChannels; c++) {
        const inChannel = input[c]
        const outChannel = output[c]
        
        let sample = inChannel[intIndex]
        if (frac > 0 && intIndex + 1 < numFrames) {
          sample = sample + frac * (inChannel[intIndex + 1] - sample)
        }
        
        if (outputIndex < numFrames) {
          outChannel[outputIndex] = sample * rampGain
        }
      }
      
      inputIndex += step
      outputIndex += 1
      
      if (step > 1.0) {
        savedSecThisBlock += (step - 1.0) / sampleRateC
      }
    }
    
    // Fill the rest of the output buffer with 0s if we compressed
    for (let c = 0; c < numChannels; c++) {
      for (let i = outputIndex; i < numFrames; i++) {
        output[c][i] = 0
      }
    }
    
    if (savedSecThisBlock > 0) {
      this.totalCompressedMs += savedSecThisBlock * 1000
      this.port.postMessage({ type: 'time-saved', ms: this.totalCompressedMs })
    }

    return true
  }
}

if (typeof registerProcessor !== 'undefined') {
  registerProcessor('silence-compressor', SilenceCompressorProcessor)
}

if (typeof module !== 'undefined') {
  module.exports = SilenceCompressorProcessor
}
