const conexaoWS = new WebSocket('ws://' + location.hostname + ':8080');

let jogador = null;
let jogoIniciado = false;
let posicoes = { jogador1: 0, jogador2: 0 };
const linhaDeChegada = 100;

const infoConexao = document.getElementById('infoConexao');
const botaoJogador1 = document.getElementById('botaoJogador1');
const botaoJogador2 = document.getElementById('botaoJogador2');
const barraJogador1 = document.getElementById('barraJogador1');
const barraJogador2 = document.getElementById('barraJogador2');

function atualizarBarras() {
  barraJogador1.style.width = posicoes.jogador1 + '%';
  barraJogador2.style.width = posicoes.jogador2 + '%';
}

function resetarBarras() {
  posicoes = { jogador1: 0, jogador2: 0 };
  atualizarBarras();
}

conexaoWS.onopen = () => {
  infoConexao.textContent = 'Conectado ao servidor... aguardando outros jogadores.';
};

conexaoWS.onmessage = (msg) => {
  const dados = JSON.parse(msg.data);

  if (dados.type === 'full') {
    infoConexao.textContent = dados.message;
    botaoJogador1.style.display = 'none';
    botaoJogador2.style.display = 'none';
    return;
  }

  if (dados.type === 'init') {
    jogador = dados.player;
    jogoIniciado = dados.gameStarted;
    posicoes = dados.positions;
    atualizarBarras();

    infoConexao.textContent = `Você é ${jogador.toUpperCase()}. Jogadores conectados: ${dados.playersConnected}/2`;

    botaoJogador1.style.display = 'none';
    botaoJogador2.style.display = 'none';
  }

  if (dados.type === 'playersCount') {
    infoConexao.textContent = `Jogadores conectados: ${dados.count}/2`;
    if (dados.count < 2) {
      jogoIniciado = false;
      resetarBarras();
      botaoJogador1.style.display = 'none';
      botaoJogador2.style.display = 'none';
    }
  }

  if (dados.type === 'countdown') {
    if (dados.value > 0) {
      infoConexao.textContent = `Corrida começa em ${dados.value}...`;
      botaoJogador1.style.display = 'none';
      botaoJogador2.style.display = 'none';
    } else {
      infoConexao.textContent = 'Corrida começou! Pressione seu botão para avançar!';
      if (jogador === 'player1') botaoJogador1.style.display = 'inline-block';
      else if (jogador === 'player2') botaoJogador2.style.display = 'inline-block';
      resetarBarras();
    }
  }

  if (dados.type === 'start') jogoIniciado = true;

  if (dados.type === 'update') {
    posicoes = dados.positions;
    atualizarBarras();
  }

  if (dados.type === 'end') {
    posicoes = dados.positions;
    atualizarBarras();
    jogoIniciado = false;

    infoConexao.textContent = (dados.winner === jogador)
      ? 'Você venceu a corrida! 🎉'
      : 'Você perdeu! 😞';

    botaoJogador1.style.display = 'none';
    botaoJogador2.style.display = 'none';
  }
};

botaoJogador1.addEventListener('click', () => {
  if (jogoIniciado && jogador === 'player1') {
    conexaoWS.send(JSON.stringify({ type: 'move', player: 'player1' }));
  }
});

botaoJogador2.addEventListener('click', () => {
  if (jogoIniciado && jogador === 'player2') {
    conexaoWS.send(JSON.stringify({ type: 'move', player: 'player2' }));
  }
});
