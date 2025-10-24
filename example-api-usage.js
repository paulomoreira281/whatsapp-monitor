// Exemplo de uso da API WhatsApp Monitor
// Execute este arquivo após iniciar o servidor e conectar as contas

// Exemplo 1: Enviar mensagem usando fetch (Node.js 18+)
async function enviarMensagemSimples() {
  const response = await fetch('http://localhost:3000/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: 1,              // ID da sessão (1 a 4)
      to: '5511999999999',       // Número do destinatário (com DDD)
      message: 'Olá! Esta é uma mensagem de teste.'
    })
  });

  const resultado = await response.json();
  console.log('Resultado:', resultado);
}

// Exemplo 2: Enviar mensagens em massa
async function enviarMensagensEmMassa() {
  const contatos = [
    { nome: 'João', numero: '5511999999999' },
    { nome: 'Maria', numero: '5511888888888' },
    { nome: 'Pedro', numero: '5511777777777' }
  ];

  for (const contato of contatos) {
    try {
      const response = await fetch('http://localhost:3000/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: 1,
          to: contato.numero,
          message: `Olá ${contato.nome}! Como você está?`
        })
      });

      const resultado = await response.json();
      console.log(`Mensagem enviada para ${contato.nome}:`, resultado);

      // Aguardar 2 segundos entre mensagens (evitar ban)
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Erro ao enviar para ${contato.nome}:`, error);
    }
  }
}

// Exemplo 3: Enviar pela mesma mensagem de contas diferentes
async function enviarDeMultiplasContas() {
  const sessoes = [1, 2, 3, 4];
  const mensagem = 'Teste de broadcast de múltiplas contas';
  const destinatario = '5511999999999';

  for (const sessionId of sessoes) {
    try {
      const response = await fetch('http://localhost:3000/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          to: destinatario,
          message: `[Conta ${sessionId}] ${mensagem}`
        })
      });

      const resultado = await response.json();
      console.log(`Sessão ${sessionId}:`, resultado);

      // Aguardar entre envios
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Erro na sessão ${sessionId}:`, error);
    }
  }
}

// Exemplo 4: Tratamento de erros
async function enviarComTratamentoDeErro() {
  try {
    const response = await fetch('http://localhost:3000/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: 1,
        to: '5511999999999',
        message: 'Teste'
      })
    });

    const resultado = await response.json();

    if (resultado.success) {
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('Para:', resultado.to);
    } else {
      console.error('❌ Erro ao enviar mensagem:', resultado.error);
    }

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  }
}

// Exemplo 5: Usando com axios (se preferir)
// npm install axios
/*
const axios = require('axios');

async function enviarComAxios() {
  try {
    const response = await axios.post('http://localhost:3000/api/send-message', {
      sessionId: 1,
      to: '5511999999999',
      message: 'Olá do axios!'
    });

    console.log('Sucesso:', response.data);
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}
*/

// Execute as funções conforme necessário:
// enviarMensagemSimples();
// enviarMensagensEmMassa();
// enviarDeMultiplasContas();
// enviarComTratamentoDeErro();

console.log('Exemplos de uso da API carregados!');
console.log('Descomente e execute as funções conforme necessário.');
