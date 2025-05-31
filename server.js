const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const servidor = http.createServer(app);
const servidorWS = new WebSocket.Server({ server: servidor });

const LINHA_DE_CHEGADA = 100;
const CONTAGEM_REGRESSIVA_INICIAL = 5;
let jogadores = {};
let posicoes = { jogador1: 0, jogador2: 0 };
let jogoIniciado = false;
let contagemRegressiva = null;
let valorContagemRegressiva = CONTAGEM_REGRESSIVA_INICIAL;

app.use(express.static(path.join(__dirname, 'public')));

function reiniciarJogo() {
  posicoes = { jogador1: 0, jogador2: 0 };
  jogoIniciado = false;
  valorContagemRegressiva = CONTAGEM_REGRESSIVA_INICIAL;
  if (contagemRegressiva) {
    clearInterval(contagemRegressiva);
    contagemRegressiva = null;
  }
}

function enviarParaTodos(dados) {
  const msg = JSON.stringify(dados);
  servidorWS.clients.forEach(cliente => {
    if (cliente.readyState === WebSocket.OPEN) {
      cliente.send(msg);
    }
  });
}

function iniciarContagemRegressiva() {
  valorContagemRegressiva = CONTAGEM_REGRESSIVA_INICIAL;
  enviarParaTodos({ type: 'countdown', value: valorContagemRegressiva });

  contagemRegressiva = setInterval(() => {
    valorContagemRegressiva--;
    if (valorContagemRegressiva >= 0) {
      enviarParaTodos({ type: 'countdown', value: valorContagemRegressiva });
    }
    if (valorContagemRegressiva === 0) {
      jogoIniciado = true;
      enviarParaTodos({ type: 'start' });
      clearInterval(contagemRegressiva);
      contagemRegressiva = null;
    }
  }, 1000);
}

servidorWS.on('connection', (ws) => {
  const jogadoresAtuais = Object.values(jogadores);
  if (!jogadoresAtuais.includes('player1')) {
    jogadores[ws._socket.remotePort] = 'player1';
  } else if (!jogadoresAtuais.includes('player2')) {
    jogadores[ws._socket.remotePort] = 'player2';
  } else {
    ws.send(JSON.stringify({ type: 'full', message: 'Sala cheia' }));
    ws.close();
    return;
  }

  const jogador = jogadores[ws._socket.remotePort];
  console.log(`✅ Jogador conectado: ${jogador}`);

  ws.send(JSON.stringify({
    type: 'init',
    player: jogador,
    gameStarted: jogoIniciado,
    positions: posicoes,
    playersConnected: Object.keys(jogadores).length,
    countdownValue: valorContagemRegressiva
  }));

  enviarParaTodos({
    type: 'playersCount',
    count: Object.keys(jogadores).length
  });

  if (Object.keys(jogadores).length === 2 && !jogoIniciado && !contagemRegressiva) {
    reiniciarJogo();
    iniciarContagemRegressiva();
  }

  ws.on('message', (mensagem) => {
    const dados = JSON.parse(mensagem);

    if (dados.type === 'move' && jogoIniciado) {
      if (dados.player === 'player1') {
        posicoes.jogador1 += 5;
        if (posicoes.jogador1 >= LINHA_DE_CHEGADA) {
          posicoes.jogador1 = LINHA_DE_CHEGADA;
          jogoIniciado = false;
          enviarParaTodos({ type: 'end', winner: 'player1', positions: posicoes });
          return;
        }
      } else if (dados.player === 'player2') {
        posicoes.jogador2 += 5;
        if (posicoes.jogador2 >= LINHA_DE_CHEGADA) {
          posicoes.jogador2 = LINHA_DE_CHEGADA;
          jogoIniciado = false;
          enviarParaTodos({ type: 'end', winner: 'player2', positions: posicoes });
          return;
        }
      }
      enviarParaTodos({ type: 'update', positions: posicoes });
    }
  });

  ws.on('close', () => {
    console.log(`❌ Jogador desconectou: ${jogador}`);
    delete jogadores[ws._socket.remotePort];
    reiniciarJogo();
    enviarParaTodos({
      type: 'playersCount',
      count: Object.keys(jogadores).length
    });
  });
});

const PORT = process.env.PORT || 3000;
servidor.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta ${PORT}');
});
//teste1