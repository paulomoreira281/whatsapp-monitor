import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeInMemoryStore
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Armazenar sockets ativos para enviar mensagens posteriormente
const activeSockets = new Map();

// Stores para cada sessão (armazenar histórico e contatos)
const stores = new Map();

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

  // Criar store para armazenar histórico e contatos
  const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
  stores.set(id, store);

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // menos logs no terminal
    browser: Browsers.windows('Desktop'),
    markOnlineOnConnect: true,
    syncFullHistory: true // Sincronizar histórico completo
  });

  // Conectar store ao socket para armazenar mensagens e contatos
  store.bind(sock.ev);

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
        await loadChatHistory(id, sock, store, io);
      }, 3000);
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

  sock.ev.on('messages.upsert', (m) => {
    const messages = m.messages.map(msg => {
      const contactName = getContactName(store, msg.key.remoteJid);

      return {
        key: msg.key,
        messageType: Object.keys(msg.message || {})[0],
        text: msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              '[Media/Other]',
        from: msg.key.remoteJid,
        fromMe: msg.key.fromMe,
        timestamp: msg.messageTimestamp,
        contactName: contactName // Nome do contato salvo
      };
    });

    // forward messages to UI
    io.emit('message', { id, messages });

    logger.info({ id, count: messages.length }, 'messages received');
  });

  // Listener para contatos (quando sincronizar)
  sock.ev.on('contacts.update', (contacts) => {
    io.emit('contacts', { id, contacts });
  });

  // Export socket on memory in case we want to use later
  return sock;
}

// Função para carregar histórico de conversas
async function loadChatHistory(id, sock, store, io) {
  try {
    // Obter todos os chats
    const chats = store.chats.all();

    logger.info({ id, chatsCount: chats.length }, 'Loading chat history');

    for (const chat of chats.slice(0, 50)) { // Limitar a 50 conversas mais recentes
      try {
        // Buscar mensagens do chat
        const messages = await sock.fetchMessagesFromWA(
          chat.id,
          50, // Limitar a 50 mensagens por conversa
          null
        );

        if (messages && messages.length > 0) {
          const formattedMessages = messages.map(msg => {
            const contactName = getContactName(store, msg.key.remoteJid);

            return {
              key: msg.key,
              messageType: Object.keys(msg.message || {})[0],
              text: msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    '[Media/Other]',
              from: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
              timestamp: msg.messageTimestamp,
              contactName: contactName,
              isHistory: true // Marcar como histórico
            };
          });

          // Enviar histórico para UI
          io.emit('chat-history', {
            id,
            chatId: chat.id,
            messages: formattedMessages.reverse() // Ordem cronológica
          });
        }
      } catch (err) {
        logger.error({ err, chatId: chat.id }, 'Error loading chat history');
      }
    }

    logger.info({ id }, 'Chat history loaded');
  } catch (err) {
    logger.error({ err, id }, 'Error loading chat history');
  }
}

// Função para obter nome do contato
function getContactName(store, jid) {
  if (!jid) return null;

  // Buscar contato no store
  const contact = store.contacts[jid];

  if (contact) {
    // Prioridade: notify (nome salvo) > name > verifiedName
    return contact.notify || contact.name || contact.verifiedName || null;
  }

  return null;
}
