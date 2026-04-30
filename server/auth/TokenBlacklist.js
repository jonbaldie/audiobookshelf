const crypto = require('crypto')

/**
 * Lightweight in-memory token blacklist with TTL-based automatic cleanup.
 * Used to immediately invalidate access JWTs on logout.
 * Entries expire naturally based on the token's original expiry time.
 */
class TokenBlacklist {
  constructor(cleanupIntervalMs = 300000) {
    this.blacklist = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs)
  }

  /**
   * @param {string} token raw JWT token string
   * @returns {string} sha256 hex digest of the token
   */
  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Add a token to the blacklist.
   * @param {string} token raw JWT token string
   * @param {Date} expiresAt when the token naturally expires
   */
  add(token, expiresAt) {
    if (!token || !expiresAt) return
    const hash = this._hashToken(token)
    this.blacklist.set(hash, expiresAt.getTime())
  }

  /**
   * Check if a token is blacklisted.
   * @param {string} token raw JWT token string
   * @returns {boolean}
   */
  isBlacklisted(token) {
    if (!token) return false
    const hash = this._hashToken(token)
    const expiry = this.blacklist.get(hash)
    if (!expiry) return false
    if (Date.now() > expiry) {
      this.blacklist.delete(hash)
      return false
    }
    return true
  }

  /**
   * Remove expired entries from the blacklist.
   */
  cleanup() {
    const now = Date.now()
    for (const [hash, expiry] of this.blacklist) {
      if (now > expiry) {
        this.blacklist.delete(hash)
      }
    }
  }

  /**
   * Stop the periodic cleanup timer.
   */
  stopCleanup() {
    clearInterval(this.cleanupInterval)
  }
}

module.exports = new TokenBlacklist()
