'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionPersistence {
  /**
   * @param {Object} deps
   * @param {Object} deps.safeStorage - Electron safeStorage module (injected, not imported)
   */
  constructor({ safeStorage }) {
    this.safeStorage = safeStorage;
    this.sessionDir = path.join(os.homedir(), '.knews');
    this.sessionFile = path.join(this.sessionDir, 'session.enc');
  }

  /**
   * Encrypt and persist the session to disk.
   * @param {Object} session - The session object to save
   * @returns {Promise<void>}
   */
  async saveSession(session) {
    const json = JSON.stringify(session);
    const encrypted = this.safeStorage.encryptString(json);

    await fs.promises.mkdir(this.sessionDir, { recursive: true });
    await fs.promises.writeFile(this.sessionFile, encrypted);
  }

  /**
   * Read and decrypt the persisted session from disk.
   * @returns {Promise<Object|null>} The session object, or null if unavailable
   */
  async loadSession() {
    try {
      const buffer = await fs.promises.readFile(this.sessionFile);
      const decrypted = this.safeStorage.decryptString(buffer);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Delete the persisted session file from disk.
   * @returns {Promise<void>}
   */
  async clearSession() {
    try {
      await fs.promises.unlink(this.sessionFile);
    } catch {
      // File may not exist; ignore
    }
  }

  /**
   * Load session only if it hasn't expired.
   * If expired, clears the session file and returns null.
   * @returns {Promise<Object|null>}
   */
  async loadValidSession() {
    const session = await this.loadSession();
    if (!session) return null;

    if (session.expiresAt && Date.now() > session.expiresAt) {
      console.log('[session-persistence] Session expired, clearing');
      await this.clearSession();
      return null;
    }

    return session;
  }
}

module.exports = SessionPersistence;
