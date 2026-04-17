'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

/**
 * File-system persistence for chat sessions.
 *
 * Layout: ~/.knews/chat/<sessionId>.json
 * Each file: { id, title, createdAt, updatedAt, messages: [{ role, content, timestamp }] }
 */
class ChatRepository {
  constructor(opts = {}) {
    this.chatDir = opts.chatDir || path.join(os.homedir(), '.knews', 'chat');
  }

  _ensureDir() {
    if (!fs.existsSync(this.chatDir)) {
      fs.mkdirSync(this.chatDir, { recursive: true });
    }
  }

  _filePath(sessionId) {
    return path.join(this.chatDir, `${sessionId}.json`);
  }

  /**
   * List all sessions (metadata only, no messages).
   * Returns array sorted by updatedAt descending.
   * @returns {Array<{id: string, title: string, createdAt: string, updatedAt: string}>}
   */
  listSessions() {
    this._ensureDir();
    const files = fs.readdirSync(this.chatDir).filter(f => f.endsWith('.json'));
    const sessions = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(this.chatDir, f), 'utf-8');
        const data = JSON.parse(raw);
        sessions.push({
          id: data.id,
          title: data.title || '新对话',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch (_e) {
        // skip corrupt files
      }
    }
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return sessions;
  }

  /**
   * Get full session with messages.
   * @param {string} sessionId
   * @returns {Object|null}
   */
  getSession(sessionId) {
    const fp = this._filePath(sessionId);
    if (!fs.existsSync(fp)) return null;
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch (_e) {
      return null;
    }
  }

  /**
   * Create a new empty session.
   * @returns {{id: string, title: string, createdAt: string, updatedAt: string, messages: Array}}
   */
  createSession() {
    this._ensureDir();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session = {
      id,
      title: '',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this._writeFile(session);
    return session;
  }

  /**
   * Save (update) a session.
   * @param {Object} session
   */
  saveSession(session) {
    this._ensureDir();
    session.updatedAt = new Date().toISOString();
    this._writeFile(session);
  }

  /**
   * Delete a session file.
   * @param {string} sessionId
   */
  deleteSession(sessionId) {
    const fp = this._filePath(sessionId);
    try {
      fs.unlinkSync(fp);
    } catch (_e) {
      // ignore if already gone
    }
  }

  _writeFile(session) {
    const fp = this._filePath(session.id);
    const tmp = fp + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(session, null, 2), 'utf-8');
    fs.renameSync(tmp, fp);
  }
}

module.exports = ChatRepository;
