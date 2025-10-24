# Como Fazer Deploy do WhatsApp Monitor

## Opção 1: Railway (RECOMENDADO) ⭐

Railway é perfeito para aplicações com WebSocket e conexões persistentes.

### Passos:

1. **Crie uma conta no Railway**
   - Acesse: https://railway.app
   - Faça login com GitHub

2. **Crie um novo projeto**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Conecte este repositório

3. **Configure as variáveis (opcional)**
   ```
   PORT=3000
   ```

4. **Deploy automático**
   - Railway detectará automaticamente o Node.js
   - O deploy será feito automaticamente
   - Você receberá uma URL pública

5. **Acesse sua aplicação**
   - Railway fornecerá uma URL tipo: `https://seu-app.railway.app`
   - Acesse e escaneie os QR Codes

### Custos:
- **Gratuito**: $5 créditos/mês (suficiente para testes)
- **Hobby**: $5/mês para uso contínuo

---

## Opção 2: Render

Render também suporta aplicações WebSocket.

### Passos:

1. **Crie uma conta no Render**
   - Acesse: https://render.com
   - Faça login com GitHub

2. **Crie um Web Service**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node

3. **Deploy**
   - Render fará o deploy automaticamente
   - Você receberá uma URL pública

### Custos:
- **Free**: Instância gratuita (hiberna após 15min inativo)
- **Starter**: $7/mês (sempre ativo)

---

## Opção 3: VPS (DigitalOcean, AWS, etc)

Para controle total e melhor performance.

### Passos Rápidos:

1. **Crie um Droplet/EC2** (Ubuntu 22.04)

2. **Instale Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

3. **Clone e configure**:
```bash
git clone seu-repositorio
cd 30.\ Whatsapp
npm install
```

4. **Inicie com PM2**:
```bash
pm2 start src/index.js --name whatsapp-monitor
pm2 save
pm2 startup
```

5. **Configure Nginx** (opcional, para SSL):
```bash
sudo apt install nginx certbot python3-certbot-nginx
# Configure reverse proxy para porta 3000
```

### Custos:
- **DigitalOcean**: A partir de $6/mês
- **AWS EC2**: Free tier por 1 ano

---

## Opção 4: Deploy Local com Ngrok

Para testes rápidos sem deploy real.

### Passos:

1. **Instale o Ngrok**:
   - Download: https://ngrok.com/download

2. **Inicie sua aplicação**:
```bash
npm start
```

3. **Exponha com Ngrok**:
```bash
ngrok http 3000
```

4. **Acesse a URL fornecida**:
   - Ngrok fornecerá uma URL pública temporária
   - Exemplo: `https://abc123.ngrok.io`

### Limitações:
- URL muda a cada reinício
- Gratuito tem limitações de banda

---

## Recomendação por Uso:

| Uso | Recomendação |
|-----|--------------|
| **Teste/Demo** | Ngrok ou Render Free |
| **Produção Pequena** | Railway |
| **Produção Média** | Render Starter ou Railway Hobby |
| **Produção Grande** | VPS Próprio |
| **Empresa** | AWS/GCP com infraestrutura dedicada |

---

## Importante:

⚠️ **Segurança**:
- Use HTTPS em produção
- Considere adicionar autenticação
- Proteja as rotas de API

⚠️ **WhatsApp ToS**:
- Use com responsabilidade
- WhatsApp pode banir contas com uso indevido
- Apenas para uso pessoal/educacional

⚠️ **Sessões**:
- As sessões (./sessions) precisam persistir
- Em Railway/Render, use volumes persistentes
- Backup regular das sessões é recomendado

---

## Comandos Úteis:

```bash
# Ver logs em produção
npm start

# Reiniciar aplicação
pm2 restart whatsapp-monitor

# Ver status
pm2 status

# Ver logs
pm2 logs whatsapp-monitor
```

---

## Suporte:

Se tiver problemas:
1. Verifique os logs
2. Confirme que a porta está correta
3. Verifique se as dependências foram instaladas
4. Teste localmente primeiro
