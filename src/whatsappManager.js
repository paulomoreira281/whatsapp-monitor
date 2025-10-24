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
    const messages = m.messages.map(msg => ({
      key: msg.key,
      messageType: Object.keys(msg.message || {})[0],
      text: msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '[Media/Other]',
      from: msg.key.remoteJid,
      fromMe: msg.key.fromMe,
      timestamp: msg.messageTimestamp
    }));

    // forward messages to UI
    io.emit('message', { id, messages });

    logger.info({ id, count: messages.length }, 'messages received');
  });

  // Export socket on memory in case we want to use later
  return sock;
}
