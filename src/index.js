import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { initWhatsAppManager, getActiveSocket } from './whatsappManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint para enviar mensagens
app.post('/api/send-message', async (req, res) => {
  const { sessionId, to, message } = req.body;

  if (!sessionId || !to || !message) {
    return res.status(400).json({
      success: false,
      error: 'sessionId, to e message são obrigatórios'
    });
  }

  const sock = getActiveSocket(sessionId);

  if (!sock) {
    return res.status(404).json({
      success: false,
      error: `Sessão ${sessionId} não está ativa ou conectada`
    });
  }

  try {
    // Formatar número para formato WhatsApp (apenas números + @s.whatsapp.net)
    const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: message });

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      to: jid
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

io.on('connection', (socket) => {
  console.log('Web client connected', socket.id);

  // Permitir envio de mensagens via Socket.IO também
  socket.on('send-message', async (data) => {
    const { sessionId, to, message } = data;
    const sock = getActiveSocket(sessionId);

    if (!sock) {
      socket.emit('message-error', {
        sessionId,
        error: 'Sessão não conectada'
      });
      return;
    }

    try {
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });

      socket.emit('message-sent', {
        sessionId,
        to: jid,
        message,
        success: true
      });
    } catch (error) {
      socket.emit('message-error', {
        sessionId,
        error: error.message
      });
    }
  });
});

(async () => {
  try {
    await initWhatsAppManager(io); // initialize 4 sessions
  } catch (e) {
    console.error('Failed to initialize WhatsApp manager', e);
  }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
