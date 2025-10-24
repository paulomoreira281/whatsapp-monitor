// Socket.IO já está carregado via <script> no HTML
const socket = io();

// Estado global
const state = {
  accounts: {
    1: { connected: false, conversations: {}, activeChat: null, user: null, unreadCount: 0 },
    2: { connected: false, conversations: {}, activeChat: null, user: null, unreadCount: 0 },
    3: { connected: false, conversations: {}, activeChat: null, user: null, unreadCount: 0 },
    4: { connected: false, conversations: {}, activeChat: null, user: null, unreadCount: 0 }
  },
  currentAccount: 1
};

// Inicializar ao carregar
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Gerar estrutura HTML para contas 2, 3 e 4
  generateAccountStructures();

  // Setup tabs
  setupAccountTabs();

  // Setup send buttons
  setupSendButtons();

  console.log('WhatsApp Monitor inicializado');
}

// Gerar estrutura HTML para contas 2, 3, 4
function generateAccountStructures() {
  const container = document.getElementById('accounts-container');

  for (let i = 2; i <= 4; i++) {
    const accountHTML = `
      <div class="whatsapp-container" id="account-${i}">
        <div class="sidebar">
          <div class="sidebar-header">
            <div class="account-info">
              <div class="account-avatar">${i}</div>
              <div class="account-details">
                <div class="account-name" id="account-name-${i}">Conta ${i}</div>
                <div class="account-status" id="account-status-${i}">Desconectado</div>
              </div>
            </div>
          </div>

          <div class="qr-section" id="qr-section-${i}">
            <h3>Conectar WhatsApp</h3>
            <div class="qr-code" id="qr-${i}">
              <span>Aguardando QR Code...</span>
            </div>
            <p class="qr-instructions">Escaneie o QR Code com seu WhatsApp</p>
          </div>

          <div class="conversations-list" id="conversations-${i}" style="display: none;">
            <div class="conversations-header">
              <h3>Conversas</h3>
            </div>
            <div class="conversations-items" id="conversations-items-${i}">
            </div>
          </div>
        </div>

        <div class="chat-area">
          <div class="chat-placeholder" id="chat-placeholder-${i}">
            <div class="placeholder-content">
              <h2>WhatsApp Monitor</h2>
              <p>Selecione uma conversa para começar a visualizar mensagens</p>
              <p class="placeholder-hint">As mensagens recebidas aparecerão automaticamente na lista à esquerda</p>
            </div>
          </div>

          <div class="chat-active" id="chat-active-${i}" style="display: none;">
            <div class="chat-header">
              <div class="chat-contact-info">
                <div class="contact-avatar" id="contact-avatar-${i}"></div>
                <div class="contact-details">
                  <div class="contact-name" id="contact-name-${i}"></div>
                  <div class="contact-number" id="contact-number-${i}"></div>
                </div>
              </div>
            </div>

            <div class="chat-messages" id="chat-messages-${i}">
            </div>

            <div class="chat-input">
              <input type="text" id="chat-input-field-${i}" placeholder="Digite uma mensagem" />
              <button class="send-button" id="send-button-${i}">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', accountHTML);
  }
}

// Setup tabs de contas
function setupAccountTabs() {
  const tabs = document.querySelectorAll('.account-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const accountId = parseInt(tab.dataset.account);
      switchAccount(accountId);
    });
  });
}

// Trocar de conta
function switchAccount(accountId) {
  state.currentAccount = accountId;

  // Atualizar tabs
  document.querySelectorAll('.account-tab').forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.account) === accountId);
  });

  // Atualizar containers
  document.querySelectorAll('.whatsapp-container').forEach((container, index) => {
    container.style.display = (index + 1) === accountId ? 'flex' : 'none';
  });
}

// Setup botões de enviar
function setupSendButtons() {
  for (let i = 1; i <= 4; i++) {
    const sendButton = document.getElementById(`send-button-${i}`);
    const inputField = document.getElementById(`chat-input-field-${i}`);

    sendButton.addEventListener('click', () => sendMessage(i));
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(i);
    });
  }
}

// Enviar mensagem
function sendMessage(sessionId) {
  const inputField = document.getElementById(`chat-input-field-${sessionId}`);
  const message = inputField.value.trim();

  if (!message) return;

  const activeChat = state.accounts[sessionId].activeChat;
  if (!activeChat) return;

  // Adicionar mensagem enviada localmente
  addMessageToChat(sessionId, {
    text: message,
    fromMe: true,
    timestamp: Math.floor(Date.now() / 1000),
    from: activeChat
  });

  // Enviar via socket
  socket.emit('send-message', {
    sessionId,
    to: activeChat,
    message
  });

  inputField.value = '';

  // Atualizar última mensagem na conversa
  updateConversationPreview(sessionId, activeChat, message, true);
}

// Socket events
socket.on('connect', () => {
  console.log('Conectado ao servidor');
});

socket.on('qr', (data) => {
  const { id, qrImage } = data;
  const qrEl = document.getElementById(`qr-${id}`);

  if (qrEl) {
    if (qrImage) {
      qrEl.innerHTML = `<img src="${qrImage}" alt="QR Code" />`;
    }
  }
});

socket.on('status', (data) => {
  const { id, status, user } = data;
  const account = state.accounts[id];

  if (status === 'connected') {
    account.connected = true;
    account.user = user;

    // Atualizar UI
    document.getElementById(`account-status-${id}`).textContent = 'Conectado';
    document.getElementById(`account-status-${id}`).classList.add('connected');

    if (user && user.name) {
      document.getElementById(`account-name-${id}`).textContent = user.name;
    }

    // Esconder QR e mostrar conversas
    document.getElementById(`qr-section-${id}`).style.display = 'none';
    document.getElementById(`conversations-${id}`).style.display = 'flex';

  } else {
    account.connected = false;
    document.getElementById(`account-status-${id}`).textContent = 'Desconectado';
    document.getElementById(`account-status-${id}`).classList.remove('connected');

    // Mostrar QR e esconder conversas
    document.getElementById(`qr-section-${id}`).style.display = 'flex';
    document.getElementById(`conversations-${id}`).style.display = 'none';
  }
});

// Receber histórico de conversas
socket.on('chat-history', (data) => {
  const { id, chatId, messages } = data;

  if (!messages || messages.length === 0) return;

  const phoneNumber = chatId.split('@')[0];
  const account = state.accounts[id];

  // Criar conversa se não existir
  if (!account.conversations[phoneNumber]) {
    const contactName = messages[0]?.contactName || null;

    account.conversations[phoneNumber] = {
      phone: phoneNumber,
      name: contactName,
      messages: [],
      unreadCount: 0,
      lastMessage: null,
      lastTime: null
    };

    createConversationItem(id, phoneNumber, contactName);
  }

  // Adicionar mensagens do histórico
  messages.forEach(msg => {
    account.conversations[phoneNumber].messages.push(msg);
  });

  // Atualizar última mensagem
  const lastMsg = messages[messages.length - 1];
  account.conversations[phoneNumber].lastMessage = lastMsg.text;
  account.conversations[phoneNumber].lastTime = lastMsg.timestamp;

  // Atualizar lista de conversas
  updateConversationItem(id, phoneNumber);

  console.log(`Histórico carregado: ${phoneNumber} (${messages.length} mensagens)`);
});

socket.on('message', (data) => {
  const { id, messages } = data;

  messages.forEach(msg => {
    const phoneNumber = msg.from.split('@')[0];
    const account = state.accounts[id];
    const contactName = msg.contactName || null;

    // Criar conversa se não existir
    if (!account.conversations[phoneNumber]) {
      account.conversations[phoneNumber] = {
        phone: phoneNumber,
        name: contactName,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
        lastTime: null
      };

      createConversationItem(id, phoneNumber, contactName);

      // Incrementar contador de novas conversas apenas se não for de mim
      if (!msg.fromMe) {
        incrementUnreadBadge(id);
      }
    }

    // Adicionar mensagem à conversa
    account.conversations[phoneNumber].messages.push(msg);
    account.conversations[phoneNumber].lastMessage = msg.text;
    account.conversations[phoneNumber].lastTime = msg.timestamp;

    // Atualizar nome se vier do backend
    if (contactName && !account.conversations[phoneNumber].name) {
      account.conversations[phoneNumber].name = contactName;
    }

    // Se não está com chat aberto, incrementar não lidas (apenas se não for minha)
    if (account.activeChat !== phoneNumber && !msg.fromMe) {
      account.conversations[phoneNumber].unreadCount++;
      incrementUnreadBadge(id);
    }

    // Atualizar lista de conversas
    updateConversationItem(id, phoneNumber);

    // Se é o chat ativo, adicionar mensagem
    if (account.activeChat === phoneNumber) {
      addMessageToChat(id, msg);
    }
  });
});

socket.on('message-sent', (data) => {
  console.log('Mensagem enviada com sucesso', data);
});

socket.on('message-error', (data) => {
  console.error('Erro ao enviar mensagem', data);
  alert(`Erro: ${data.error}`);
});

// Criar item de conversa na sidebar
function createConversationItem(sessionId, phoneNumber, contactName = null) {
  const conversationsContainer = document.getElementById(`conversations-items-${sessionId}`);
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Usar nome do contato se disponível, senão usar número formatado
  const displayName = contactName || formattedPhone;
  const avatar = getInitials(displayName);

  const conversationHTML = `
    <div class="conversation-item" id="conversation-${sessionId}-${phoneNumber}" data-phone="${phoneNumber}">
      <div class="conversation-avatar">${avatar}</div>
      <div class="conversation-content">
        <div class="conversation-header">
          <span class="conversation-name" id="conv-name-${sessionId}-${phoneNumber}">${displayName}</span>
          <span class="conversation-time" id="conv-time-${sessionId}-${phoneNumber}"></span>
        </div>
        <div class="conversation-preview">
          <span class="conversation-last-message" id="conv-msg-${sessionId}-${phoneNumber}">Nova conversa</span>
          <span class="conversation-unread-count" id="conv-unread-${sessionId}-${phoneNumber}" style="display: none;">0</span>
        </div>
      </div>
    </div>
  `;

  conversationsContainer.insertAdjacentHTML('afterbegin', conversationHTML);

  // Add click event
  document.getElementById(`conversation-${sessionId}-${phoneNumber}`).addEventListener('click', () => {
    openChat(sessionId, phoneNumber);
  });
}

// Atualizar item de conversa
function updateConversationItem(sessionId, phoneNumber) {
  const conversation = state.accounts[sessionId].conversations[phoneNumber];

  const nameEl = document.getElementById(`conv-name-${sessionId}-${phoneNumber}`);
  const timeEl = document.getElementById(`conv-time-${sessionId}-${phoneNumber}`);
  const msgEl = document.getElementById(`conv-msg-${sessionId}-${phoneNumber}`);
  const unreadEl = document.getElementById(`conv-unread-${sessionId}-${phoneNumber}`);
  const itemEl = document.getElementById(`conversation-${sessionId}-${phoneNumber}`);

  // Atualizar nome se disponível
  if (nameEl && conversation.name) {
    nameEl.textContent = conversation.name;
  }

  if (timeEl) timeEl.textContent = formatTime(conversation.lastTime);
  if (msgEl) msgEl.textContent = truncateText(conversation.lastMessage, 40);

  if (unreadEl && conversation.unreadCount > 0) {
    unreadEl.textContent = conversation.unreadCount;
    unreadEl.style.display = 'block';
    itemEl.classList.add('unread');
  } else if (unreadEl) {
    unreadEl.style.display = 'none';
    itemEl.classList.remove('unread');
  }

  // Mover para o topo
  const parent = itemEl?.parentNode;
  if (parent && itemEl) {
    parent.insertBefore(itemEl, parent.firstChild);
  }
}

// Atualizar preview da conversa após enviar
function updateConversationPreview(sessionId, phoneNumber, message, fromMe) {
  const conversation = state.accounts[sessionId].conversations[phoneNumber];
  if (conversation) {
    conversation.lastMessage = message;
    conversation.lastTime = Math.floor(Date.now() / 1000);
    updateConversationItem(sessionId, phoneNumber);
  }
}

// Abrir chat
function openChat(sessionId, phoneNumber) {
  const account = state.accounts[sessionId];
  account.activeChat = phoneNumber;

  const conversation = account.conversations[phoneNumber];

  // Zerar não lidas
  if (conversation) {
    conversation.unreadCount = 0;
  }

  // Atualizar badge da tab
  updateAccountBadge(sessionId);

  // Atualizar conversação selecionada
  document.querySelectorAll(`#conversations-items-${sessionId} .conversation-item`).forEach(item => {
    item.classList.remove('active');
  });
  document.getElementById(`conversation-${sessionId}-${phoneNumber}`)?.classList.add('active');

  // Esconder placeholder, mostrar chat
  document.getElementById(`chat-placeholder-${sessionId}`).style.display = 'none';
  document.getElementById(`chat-active-${sessionId}`).style.display = 'flex';

  // Atualizar header do chat com nome ou número
  const displayName = conversation?.name || formatPhoneNumber(phoneNumber);
  document.getElementById(`contact-name-${sessionId}`).textContent = displayName;
  document.getElementById(`contact-number-${sessionId}`).textContent = phoneNumber;
  document.getElementById(`contact-avatar-${sessionId}`).textContent = getInitials(displayName);

  // Carregar mensagens
  loadChatMessages(sessionId, phoneNumber);

  // Atualizar contadores
  updateConversationItem(sessionId, phoneNumber);
}

// Carregar mensagens do chat
function loadChatMessages(sessionId, phoneNumber) {
  const chatContainer = document.getElementById(`chat-messages-${sessionId}`);
  chatContainer.innerHTML = '';

  const conversation = state.accounts[sessionId].conversations[phoneNumber];
  if (conversation && conversation.messages) {
    conversation.messages.forEach(msg => {
      addMessageToChat(sessionId, msg, false);
    });
  }

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Adicionar mensagem ao chat
function addMessageToChat(sessionId, message, shouldScroll = true) {
  const chatContainer = document.getElementById(`chat-messages-${sessionId}`);
  const messageType = message.fromMe ? 'sent' : 'received';

  // Adicionar ícone de tipo de mídia se não for texto
  let mediaIcon = '';
  if (message.messageType === 'image') {
    mediaIcon = '📷 ';
  } else if (message.messageType === 'video') {
    mediaIcon = '🎥 ';
  } else if (message.messageType === 'audio') {
    mediaIcon = '🎵 ';
  } else if (message.messageType === 'document') {
    mediaIcon = '📄 ';
  } else if (message.messageType === 'sticker') {
    mediaIcon = '🎨 ';
  } else if (message.messageType === 'contact') {
    mediaIcon = '👤 ';
  } else if (message.messageType === 'location') {
    mediaIcon = '📍 ';
  }

  const messageHTML = `
    <div class="message-bubble ${messageType}">
      <div class="message-text">${mediaIcon}${escapeHtml(message.text)}</div>
      <div class="message-meta">
        <span class="message-time">${formatTime(message.timestamp)}</span>
        ${message.fromMe ? '<span class="message-checks">✓✓</span>' : ''}
      </div>
    </div>
  `;

  chatContainer.insertAdjacentHTML('beforeend', messageHTML);

  if (shouldScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Utilidades
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return `+55 (${cleaned.substr(2, 2)}) ${cleaned.substr(4, 5)}-${cleaned.substr(9)}`;
  } else if (cleaned.length === 11) {
    return `(${cleaned.substr(0, 2)}) ${cleaned.substr(2, 5)}-${cleaned.substr(7)}`;
  }
  return phone;
}

function formatTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp * 1000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  if (diffDays === 0) {
    return time;
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  } else {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
}

function getInitials(text) {
  const cleaned = text.replace(/[^\w\s]/gi, '');
  const words = cleaned.split(' ').filter(w => w.length > 0);

  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  } else if (text.length >= 2) {
    return text.substring(0, 2).toUpperCase();
  }
  return '??';
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Incrementar badge de não lidas
function incrementUnreadBadge(sessionId) {
  const account = state.accounts[sessionId];

  // Contar total de não lidas
  let totalUnread = 0;
  for (const phoneNumber in account.conversations) {
    const conv = account.conversations[phoneNumber];
    if (account.activeChat !== phoneNumber) {
      totalUnread += conv.unreadCount || 0;
    }
  }

  account.unreadCount = totalUnread;
  updateAccountBadge(sessionId);
}

// Atualizar badge da tab
function updateAccountBadge(sessionId) {
  const account = state.accounts[sessionId];
  const tab = document.querySelector(`.account-tab[data-account="${sessionId}"]`);

  if (!tab) return;

  // Remover badge existente
  const existingBadge = tab.querySelector('.account-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // Calcular total de não lidas
  let totalUnread = 0;
  for (const phoneNumber in account.conversations) {
    const conv = account.conversations[phoneNumber];
    if (account.activeChat !== phoneNumber) {
      totalUnread += conv.unreadCount || 0;
    }
  }

  // Adicionar badge se houver não lidas
  if (totalUnread > 0) {
    const badge = document.createElement('span');
    badge.className = 'account-badge';
    badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    tab.appendChild(badge);
  }
}
