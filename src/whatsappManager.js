import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Armazenar sockets ativos para enviar mensagens posteriormente
const activeSockets = new Map();

export async function initWhatsAppManager(io) {
  const sessions = [1, 2, 3, 4];
  for (const id of sessions) {
    // initialize each session but don't await forever — run in background
    createSession(id, io).catch(err => logger.error({ err, id }, 'session init error'));
  }
}

export function getActiveSocket(id) {
  return activeSockets.get(id);
}

async function createSession(id, io) {
  const folder = `./sessions/session-${id}`;
  const { state, saveCreds } = await useMultiFileAuthState(folder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // menos logs no terminal
    browser: Browsers.windows('Desktop'),
    markOnlineOnConnect: true
  });

  // Armazenar socket ativo
  activeSockets.set(id, sock);

  // persist credentials automatically
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrImage = await qrcode.toDataURL(qr);
        io.emit('qr', { id, qr, qrImage });
        logger.info({ id }, 'QR generated and emitted');
      } catch (e) {
        logger.error({ err: e, id }, 'qr -> dataurl failed');
        io.emit('qr', { id, qr });
      }
    }

    if (connection === 'open') {
      logger.info({ id }, 'connected');
      const user = sock.user;
      io.emit('status', {
        id,
        status: 'connected',
        user: {
          id: user?.id,
          name: user?.name
        }
      });

      // Enviar histórico de conversas após conectar
      setTimeout(async () => {
        await loadChatHistory(id, sock, io);
      }, 5000);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.warn({ id, lastDisconnect, shouldReconnect }, 'disconnected');

      io.emit('status', {
        id,
        status: 'disconnected',
        lastDisconnect,
        shouldReconnect
      });

      // Tentar reconectar se não foi logout manual
      if (shouldReconnect) {
        logger.info({ id }, 'Reconnecting...');
        setTimeout(() => {
          createSession(id, io).catch(err =>
            logger.error({ err, id }, 'reconnection failed')
          );
        }, 3000);
      } else {
        activeSockets.delete(id);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const messages = await Promise.all(m.messages.map(async msg => {
      let contactName = null;

      // Tentar obter nome do contato
      if (msg.key.remoteJid && !msg.key.fromMe) {
        try {
          contactName = msg.pushName || msg.verifiedBizName || null;
        } catch (err) {
          contactName = null;
        }
      }

      // Extrair texto da mensagem dependendo do tipo
      let text = '';
      let messageType = 'text';

      if (msg.message) {
        if (msg.message.conversation) {
          text = msg.message.conversation;
          messageType = 'text';
        } else if (msg.message.extendedTextMessage) {
          text = msg.message.extendedTextMessage.text;
          messageType = 'text';
        } else if (msg.message.imageMessage) {
          text = msg.message.imageMessage.caption || '📷 Imagem';
          messageType = 'image';
        } else if (msg.message.videoMessage) {
          text = msg.message.videoMessage.caption || '🎥 Vídeo';
          messageType = 'video';
        } else if (msg.message.audioMessage) {
          text = '🎵 Áudio';
          messageType = 'audio';
        } else if (msg.message.documentMessage) {
          text = `📄 ${msg.message.documentMessage.fileName || 'Documento'}`;
          messageType = 'document';
        } else if (msg.message.stickerMessage) {
          text = '🎨 Figurinha';
          messageType = 'sticker';
        } else if (msg.message.contactMessage) {
          text = `👤 Contato: ${msg.message.contactMessage.displayName || 'Contato'}`;
          messageType = 'contact';
        } else if (msg.message.locationMessage) {
          text = '📍 Localização';
          messageType = 'location';
        } else {
          text = '[Mensagem não suportada]';
          messageType = 'other';
        }
      }

      return {
        key: msg.key,
        messageType: messageType,
        text: text,
        from: msg.key.remoteJid,
        fromMe: msg.key.fromMe,
        timestamp: msg.messageTimestamp,
        contactName: contactName // Nome do contato salvo
      };
    }));

    // forward messages to UI (incluindo mensagens enviadas por mim)
    io.emit('message', { id, messages });

    logger.info({ id, count: messages.length }, 'messages received');
  });

  // Export socket on memory in case we want to use later
  return sock;
}

// Função para carregar histórico de conversas
async function loadChatHistory(id, sock, io) {
  try {
    logger.info({ id }, 'Loading chat history...');

    // Buscar todas as conversas (grupos e individuais)
    const chats = await sock.groupFetchAllParticipating().catch(() => ({}));

    // Processar grupos
    for (const groupId in chats) {
      try {
        // Buscar últimas mensagens do grupo
        const messages = await sock.fetchMessagesFromWA(groupId, 20).catch(() => []);

        if (messages && messages.length > 0) {
          const formattedMessages = messages.map(msg => {
            let text = '';
            let messageType = 'text';

            if (msg.message) {
              if (msg.message.conversation) {
                text = msg.message.conversation;
              } else if (msg.message.extendedTextMessage) {
                text = msg.message.extendedTextMessage.text;
              } else if (msg.message.imageMessage) {
                text = msg.message.imageMessage.caption || '📷 Imagem';
                messageType = 'image';
              } else if (msg.message.videoMessage) {
                text = msg.message.videoMessage.caption || '🎥 Vídeo';
                messageType = 'video';
              } else if (msg.message.audioMessage) {
                text = '🎵 Áudio';
                messageType = 'audio';
              } else {
                text = '[Mídia]';
              }
            }

            return {
              key: msg.key,
              messageType: messageType,
              text: text,
              from: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
              timestamp: msg.messageTimestamp,
              contactName: chats[groupId].subject || null,
              isHistory: true
            };
          }).reverse();

          io.emit('chat-history', {
            id,
            chatId: groupId,
            messages: formattedMessages
          });
        }
      } catch (err) {
        logger.error({ err, groupId }, 'Error loading group history');
      }
    }

    logger.info({ id, chatsCount: Object.keys(chats).length }, 'Chat history loaded');
  } catch (err) {
    logger.error({ err, id }, 'Error loading chat history');
  }
}
