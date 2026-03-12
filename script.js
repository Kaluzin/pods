var produtoAtual = '';
var precoAtual = 0;
var freteAtual = 0;

function comprar(produto) {
  abrirCheckout(produto, 0);
}

function abrirCheckout(produto, preco) {
  produtoAtual = produto;
  precoAtual = preco;
  freteAtual = 0;

  document.getElementById('modalProdutoNome').innerHTML =
    '<strong>' + produto + '</strong>' +
    (preco > 0 ? '<br><span style="color:#cc0000;font-size:18px;font-weight:800;">R$ ' + preco.toFixed(2).replace('.', ',') + '</span>' : '');

  atualizarPixTotal();
  document.getElementById('freteModalResultado').innerHTML = '';
  document.getElementById('cepModal').value = '';

  var cepPrincipal = document.getElementById('cepInput');
  if (cepPrincipal && cepPrincipal.value.length >= 8) {
    document.getElementById('cepModal').value = cepPrincipal.value;
  }

  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalCheckout').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalCheckout').classList.remove('open');
  document.body.style.overflow = '';
}

function atualizarPixTotal() {
  var desconto = precoAtual * 0.05;
  var totalPix = precoAtual - desconto + freteAtual;
  var totalNormal = precoAtual + freteAtual;

  var html = '';
  if (precoAtual > 0) {
    html = '<div style="font-size:13px;color:#888;margin-bottom:4px;">Produto: R$ ' + precoAtual.toFixed(2).replace('.', ',') + '</div>';
    if (freteAtual > 0) {
      html += '<div style="font-size:13px;color:#888;margin-bottom:4px;">Frete: R$ ' + freteAtual.toFixed(2).replace('.', ',') + '</div>';
    } else if (freteAtual === -1) {
      html += '<div style="font-size:13px;color:#00cc66;margin-bottom:4px;">Frete: GRÁTIS</div>';
    }
    html += '<div style="font-size:13px;color:#00cc66;margin-bottom:4px;">Desconto PIX (5%): - R$ ' + desconto.toFixed(2).replace('.', ',') + '</div>';
    html += '<div style="font-size:26px;font-weight:800;color:#cc0000;">Total PIX: R$ ' + (freteAtual === -1 ? (precoAtual - desconto) : totalPix).toFixed(2).replace('.', ',') + '</div>';
  }
  document.getElementById('pixTotal').innerHTML = html;

  var msgFrete = freteAtual > 0 ? ' + frete R$ ' + freteAtual.toFixed(2).replace('.', ',') : (freteAtual === -1 ? ' + frete GRÁTIS' : '');
  var link = 'https://wa.me/5511947871294?text=' + encodeURIComponent(
    'Olá! Quero comprar: ' + produtoAtual +
    '\nValor: R$ ' + precoAtual.toFixed(2).replace('.', ',') +
    msgFrete +
    '\nVou pagar via PIX.'
  );
  document.getElementById('modalWhatsapp').href = link;
}

function copiarPix() {
  var texto = '+55 (11) 94787-1294';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(function () {
      var btn = document.querySelector('.btn-copiar');
      var original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.style.background = '#00cc66';
      setTimeout(function () {
        btn.textContent = original;
        btn.style.background = '';
      }, 2000);
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Chave PIX copiada!');
  }
}

function calcularFrete() {
  var cep = document.getElementById('cepInput').value.replace(/\D/g, '');
  executarCalculoFrete(cep, 'freteResultado', false);
}

function calcularFreteModal() {
  var cep = document.getElementById('cepModal').value.replace(/\D/g, '');
  executarCalculoFrete(cep, 'freteModalResultado', true);
}

function executarCalculoFrete(cep, elementoId, isModal) {
  var el = document.getElementById(elementoId);
  if (cep.length !== 8) {
    el.innerHTML = '<p class="frete-erro">CEP inválido. Digite 8 números.</p>';
    return;
  }
  el.innerHTML = '<p style="color:#aaa;font-size:13px;">Buscando endereço...</p>';

  fetch('https://viacep.com.br/ws/' + cep + '/json/')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.erro) {
        el.innerHTML = '<p class="frete-erro">CEP não encontrado. Verifique e tente novamente.</p>';
        return;
      }

      var uf = data.uf;
      var cidade = data.localidade;
      var bairro = data.bairro ? ' - ' + data.bairro : '';
      var enderecoTxt = cidade + bairro + ' / ' + uf;

      var opcoes = calcularOpcoesFrete(uf, cidade);

      var html = '<div class="frete-address">📍 ' + enderecoTxt + '</div>';
      html += '<div class="frete-opcoes">';

      opcoes.forEach(function (op) {
        html += '<div class="frete-opcao">';
        html += '<div><div class="frete-nome">' + op.nome + '</div><div class="frete-prazo">' + op.prazo + '</div></div>';
        if (op.valor === 0) {
          html += '<span class="frete-gratis">GRÁTIS</span>';
        } else {
          html += '<span class="frete-valor">R$ ' + op.valor.toFixed(2).replace('.', ',') + '</span>';
        }
        html += '</div>';
      });
      html += '</div>';

      el.innerHTML = html;

      if (isModal && opcoes.length > 0) {
        freteAtual = opcoes[0].valor === 0 ? -1 : opcoes[0].valor;
        atualizarPixTotal();
      }
    })
    .catch(function () {
      el.innerHTML = '<p class="frete-erro">Erro ao buscar CEP. Verifique sua conexão.</p>';
    });
}

function calcularOpcoesFrete(uf, cidade) {
  var spCapital = ['São Paulo', 'Sao Paulo'];
  var isSpCapital = uf === 'SP' && spCapital.some(function (c) { return cidade.toLowerCase().includes('são paulo') || cidade.toLowerCase().includes('sao paulo'); });
  var isSP = uf === 'SP';
  var isSudeste = ['SP', 'RJ', 'MG', 'ES'].includes(uf);
  var isSul = ['PR', 'SC', 'RS'].includes(uf);
  var isCentroOeste = ['GO', 'MT', 'MS', 'DF'].includes(uf);
  var isNordeste = ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA'].includes(uf);
  var isNorte = ['AM', 'PA', 'AC', 'RO', 'RR', 'TO', 'AP'].includes(uf);

  if (isSpCapital) {
    return [
      { nome: 'Motoboy (São Paulo Capital)', prazo: '1–2 dias úteis', valor: 0 },
      { nome: 'Correios PAC', prazo: '2–4 dias úteis', valor: 15.90 },
      { nome: 'Correios SEDEX', prazo: '1–2 dias úteis', valor: 25.90 }
    ];
  } else if (isSP) {
    return [
      { nome: 'Correios PAC', prazo: '2–4 dias úteis', valor: 18.90 },
      { nome: 'Correios SEDEX', prazo: '1–3 dias úteis', valor: 29.90 }
    ];
  } else if (isSudeste || isSul) {
    return [
      { nome: 'Correios PAC', prazo: '3–6 dias úteis', valor: 22.90 },
      { nome: 'Correios SEDEX', prazo: '2–4 dias úteis', valor: 34.90 }
    ];
  } else if (isCentroOeste) {
    return [
      { nome: 'Correios PAC', prazo: '5–8 dias úteis', valor: 26.90 },
      { nome: 'Correios SEDEX', prazo: '3–5 dias úteis', valor: 39.90 }
    ];
  } else if (isNordeste) {
    return [
      { nome: 'Correios PAC', prazo: '6–10 dias úteis', valor: 28.90 },
      { nome: 'Correios SEDEX', prazo: '4–7 dias úteis', valor: 44.90 }
    ];
  } else if (isNorte) {
    return [
      { nome: 'Correios PAC', prazo: '8–14 dias úteis', valor: 34.90 },
      { nome: 'Correios SEDEX', prazo: '5–9 dias úteis', valor: 54.90 }
    ];
  } else {
    return [
      { nome: 'Correios PAC', prazo: 'A consultar', valor: 24.90 },
      { nome: 'Correios SEDEX', prazo: 'A consultar', valor: 39.90 }
    ];
  }
}

function formatarCep(input) {
  var v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) {
    v = v.slice(0, 5) + '-' + v.slice(5);
  }
  input.value = v;
}

function toggleMenu() {
  var nav = document.getElementById('mobileNav');
  nav.classList.toggle('open');
}

function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var icon = btn.querySelector('.faq-icon');
  var isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-answer.open').forEach(function (a) {
    a.classList.remove('open');
  });
  document.querySelectorAll('.faq-icon').forEach(function (i) {
    i.textContent = '+';
  });
  if (!isOpen) {
    answer.classList.add('open');
    icon.textContent = '−';
  }
}

function subscribeNewsletter(e) {
  e.preventDefault();
  alert('Cadastro realizado com sucesso! Em breve você receberá nossas novidades.');
  e.target.reset();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') fecharModal();
});
