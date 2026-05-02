class SmartSpeedProcessorCore {
  constructor({
    sampleRate,
    compressionRatio = 1,
    minimumSilenceMs = 200
  } = {}) {
    this.sampleRate = sampleRate || 0
    this.compressionRatio = compressionRatio
    this.minimumSilenceMs = minimumSilenceMs

    this._isActive = false
    this._droppedSamples = 0
    this._pendingDropSamples = 0
  }

  get isActive() {
    return this._isActive
  }

  get droppedSamples() {
    return this._droppedSamples
  }

  updateRegion(isSilence, durationSamples) {
    if (!Number.isFinite(durationSamples) || durationSamples <= 0) {
      return null
    }

    if (!isSilence || this.compressionRatio <= 1 || this.sampleRate <= 0) {
      return this._setInactive()
    }

    const durationMs = (durationSamples / this.sampleRate) * 1000
    if (durationMs < this.minimumSilenceMs) {
      return this._setInactive()
    }

    const keepSamples = Math.ceil(durationSamples / this.compressionRatio)
    this._pendingDropSamples = Math.max(0, durationSamples - keepSamples)
    return this._setActive()
  }

  process(input) {
    const inputSamples = ArrayBuffer.isView(input) ? input : []
    if (!inputSamples.length) {
      return {
        output: inputSamples,
        droppedSamples: 0,
        totalDroppedSamples: this._droppedSamples,
        becameActive: false,
        becameInactive: false,
        isActive: this._isActive
      }
    }

    const becameActive = this._consumeBecameActive()
    const becameInactive = this._consumeBecameInactive()

    if (!this._isActive || this._pendingDropSamples <= 0) {
      return {
        output: inputSamples,
        droppedSamples: 0,
        totalDroppedSamples: this._droppedSamples,
        becameActive,
        becameInactive,
        isActive: this._isActive
      }
    }

    const droppedSamples = Math.min(this._pendingDropSamples, inputSamples.length)
    this._pendingDropSamples -= droppedSamples
    this._droppedSamples += droppedSamples

    if (this._pendingDropSamples === 0) {
      this._isActive = false
    }

    return {
      output: inputSamples.subarray(droppedSamples),
      droppedSamples,
      totalDroppedSamples: this._droppedSamples,
      becameActive,
      becameInactive,
      isActive: this._isActive
    }
  }

  reset() {
    this._isActive = false
    this._droppedSamples = 0
    this._pendingDropSamples = 0
    this._becameActive = false
    this._becameInactive = false
  }

  _setActive() {
    if (!this._isActive) {
      this._isActive = true
      this._becameActive = true
    }
    this._becameInactive = false
    return { isActive: this._isActive }
  }

  _setInactive() {
    this._pendingDropSamples = 0
    if (this._isActive) {
      this._isActive = false
      this._becameInactive = true
    }
    this._becameActive = false
    return { isActive: this._isActive }
  }

  _consumeBecameActive() {
    const becameActive = !!this._becameActive
    this._becameActive = false
    return becameActive
  }

  _consumeBecameInactive() {
    const becameInactive = !!this._becameInactive
    this._becameInactive = false
    return becameInactive
  }
}

module.exports = SmartSpeedProcessorCore
