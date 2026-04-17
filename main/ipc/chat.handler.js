'use strict';

/**
 * Register IPC handlers for chat operations.
 *
 * Channels:
 *   chat:listSessions       - list all sessions (metadata only)
 *   chat:getSession         - get full session with messages
 *   chat:createSession      - create a new empty session
 *   chat:sendMessage        - send user message and get AI reply (non-streaming)
 *   chat:sendMessageStream  - send user message with streaming reply (ipcMain.on + event.send)
 *   chat:deleteSession      - delete a session
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/chat/chat-service')} deps.chatService
 */
function register(ipcMain, { chatService }) {
  ipcMain.handle('chat:listSessions', async () => {
    try {
      return chatService.listSessions();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('chat:getSession', async (_event, sessionId) => {
    try {
      const session = chatService.getSession(sessionId);
      return session || { error: '会话不存在。' };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('chat:createSession', async () => {
    try {
      const session = chatService.createSession();
      return { success: true, session };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('chat:sendMessage', async (_event, { sessionId, content, isHotTopic }) => {
    try {
      const result = await chatService.sendMessage(sessionId, content, { isHotTopic });
      return { success: true, ...result };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.on('chat:sendMessageStream', (event, { sessionId, content, isHotTopic }) => {
    const sender = event.sender;
    chatService.sendMessageStream(
      sessionId,
      content,
      { isHotTopic },
      (streamEvent) => {
        try {
          sender.send('chat:streamEvent', streamEvent);
        } catch (_e) {
          // Sender may be destroyed if window closed during streaming
        }
      },
    ).catch((err) => {
      try {
        sender.send('chat:streamEvent', { type: 'error', error: err.message });
      } catch (_e) {
        // Ignore if sender is gone
      }
    });
  });

  ipcMain.on('chat:abortStream', () => {
    chatService.abortStream();
  });

  ipcMain.handle('chat:deleteSession', async (_event, sessionId) => {
    try {
      chatService.deleteSession(sessionId);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
