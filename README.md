# WhatsApp Monitor — 4 Contas Simultâneas

Sistema completo para monitorar e gerenciar até 4 contas WhatsApp simultaneamente usando Baileys (biblioteca Node.js para WhatsApp Web), com interface web moderna, Socket.IO em tempo real e API REST.

## Funcionalidades

- **Monitoramento de 4 contas** WhatsApp simultaneamente
- **Interface web moderna** com design responsivo
- **QR Code** para autenticação rápida
- **Envio de mensagens** através da interface web
- **Recebimento em tempo real** de todas as mensagens
- **Reconexão automática** em caso de desconexão
- **Persistência de sessão** - mantém login entre reinícios
- **API REST** para integração com outros sistemas
- **Socket.IO** para comunicação em tempo real

## Requisitos

- Node.js 18+ (recomendado)
- npm ou yarn
- Um navegador moderno (Chrome, Firefox, Edge, Safari)

## Instalação

1. Clone ou baixe este repositório

2. Instale as dependências:
```bash
npm install
```

## Como Usar

### 1. Iniciar o servidor

```bash
npm start
```

Ou para modo de desenvolvimento (com auto-reload):
```bash
npm run dev
```

O servidor iniciará em `http://localhost:3000`

### 2. Conectar contas WhatsApp

1. Abra `http://localhost:3000` no navegador
2. Você verá 4 cartões, um para cada conta
3. Para cada conta que deseja conectar:
   - Abra o WhatsApp no celular
   - Vá em **Configurações → Dispositivos conectados → Conectar dispositivo**
   - Escaneie o QR Code exibido no cartão correspondente
4. Após escanear, a conta será conectada e o status mudará para "connected"
5. O formulário de envio de mensagens aparecerá automaticamente

### 3. Enviar mensagens

Uma vez conectado, você pode enviar mensagens através da interface web:

1. Digite o número do destinatário (com DDD, sem espaços)
   - Exemplo: `5511999999999`
2. Digite a mensagem
3. Clique em "Enviar"

### 4. Monitorar mensagens recebidas

Todas as mensagens recebidas aparecem automaticamente em tempo real na seção "Mensagens Recebidas" de cada conta.

## API REST

O sistema também oferece uma API REST para envio de mensagens:

### Enviar mensagem

```http
POST /api/send-message
Content-Type: application/json

{
  "sessionId": 1,
  "to": "5511999999999",
  "message": "Olá, tudo bem?"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "to": "5511999999999@s.whatsapp.net"
}
```

**Resposta de erro:**
```json
{
  "success": false,
  "error": "Sessão 1 não está ativa ou conectada"
}
```

### Exemplo com cURL

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "to": "5511999999999",
    "message": "Teste de mensagem"
  }'
```

### Exemplo com JavaScript/Fetch

```javascript
fetch('http://localhost:3000/api/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 1,
    to: '5511999999999',
    message: 'Olá!'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## Estrutura do Projeto

```
30. Whatsapp/
├── src/
│   ├── index.js           # Servidor Express + Socket.IO
│   └── whatsappManager.js # Gerenciador das sessões Baileys
├── public/
│   ├── index.html         # Interface web
│   ├── client.js          # Cliente Socket.IO
│   └── styles.css         # Estilos modernos
├── sessions/              # Credenciais das sessões (criado automaticamente)
│   ├── session-1/
│   ├── session-2/
│   ├── session-3/
│   └── session-4/
├── package.json
├── .gitignore
└── README.md
```

## Persistência das Sessões

As credenciais são armazenadas automaticamente em `./sessions/session-<n>` (onde n = 1 a 4).

**Para manter sessões entre reinícios:**
- Mantenha as pastas `sessions/session-*` intactas

**Para deslogar uma conta:**
- Pare o servidor
- Delete a pasta correspondente (exemplo: `sessions/session-2`)
- Reinicie o servidor

## Reconexão Automática

O sistema detecta automaticamente desconexões e tenta reconectar, exceto quando:
- Você fez logout manual pelo celular
- A sessão foi revogada nos "Dispositivos conectados"

## Limitações e Avisos Importantes

- **Termos de Serviço**: Baileys emula um cliente WhatsApp Web. O uso pode violar os Termos de Serviço do WhatsApp. Use por sua conta e risco.
- **Ban Risk**: WhatsApp pode banir contas que usam automação excessiva ou comportamento suspeito
- **Uma conta por sessão**: Cada sessão representa um número/telefone diferente. Não use o mesmo número em múltiplas sessões
- **Apenas para fins educacionais e/ou uso pessoal**

## Tecnologias Utilizadas

- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - Cliente WhatsApp Web
- [Express](https://expressjs.com/) - Servidor HTTP
- [Socket.IO](https://socket.io/) - Comunicação em tempo real
- [QRCode](https://github.com/soldair/node-qrcode) - Geração de QR codes
- [Pino](https://github.com/pinojs/pino) - Logger de alto desempenho

## Troubleshooting

### QR Code não aparece
- Verifique se a porta 3000 está livre
- Verifique os logs do terminal
- Tente recarregar a página

### Não consegue enviar mensagens
- Certifique-se de que a sessão está com status "connected"
- Verifique se o número está no formato correto (apenas números com DDD)
- Verifique os logs do navegador (F12)

### Desconexões frequentes
- Verifique sua conexão com a internet
- Evite usar a mesma conta em múltiplos dispositivos/sessões
- Verifique se não há bloqueios de firewall

### Erro ao instalar dependências
- Certifique-se de ter Node.js 18+ instalado
- Tente limpar o cache do npm: `npm cache clean --force`
- Delete a pasta `node_modules` e `package-lock.json` e reinstale

## Próximas Melhorias Sugeridas

- [ ] Autenticação/login no painel web
- [ ] Banco de dados para histórico de mensagens (MongoDB/SQLite)
- [ ] Envio de imagens e arquivos
- [ ] Webhooks para integração externa
- [ ] Dashboard com estatísticas
- [ ] Agendamento de mensagens
- [ ] Respostas automáticas

## Suporte

Este é um projeto de código aberto para fins educacionais. Use por sua conta e risco.

## Licença

MIT
