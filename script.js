/* ===== CHECKOUT ===== */
var produtoAtual = '';
var precoAtual = 0;
var freteAtual = 0;
var metodoPagamento = 'pix';

function abrirCheckout(produto, preco) {
  produtoAtual = produto;
  precoAtual = preco;
  freteAtual = 0;
  metodoPagamento = 'pix';

  document.getElementById('modalProdutoNome').innerHTML =
    '<strong>' + produto + '</strong>' +
    (preco > 0 ? '<br><span style="color:#cc0000;font-size:18px;font-weight:800;">R$ ' + preco.toFixed(2).replace('.', ',') + '</span>' : '');

  atualizarPixTotal();
  atualizarCartaoTotal();
  document.getElementById('freteModalResultado').innerHTML = '';
  document.getElementById('cepModal').value = '';

  var cepPrincipal = document.getElementById('cepInput');
  if (cepPrincipal && cepPrincipal.value.length >= 8) {
    document.getElementById('cepModal').value = cepPrincipal.value;
  }

  mudarPagamento('pix', document.getElementById('payTabPix'));

  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalCheckout').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalCheckout').classList.remove('open');
  document.body.style.overflow = '';
}

function mudarPagamento(tipo, btn) {
  metodoPagamento = tipo;
  document.getElementById('payPix').style.display = tipo === 'pix' ? 'block' : 'none';
  document.getElementById('payCartao').style.display = tipo === 'cartao' ? 'block' : 'none';
  document.querySelectorAll('.pay-tab').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (tipo === 'cartao') atualizarCartaoTotal();
}

function atualizarPixTotal() {
  var desconto = precoAtual * 0.05;
  var totalPix = precoAtual - desconto + (freteAtual > 0 ? freteAtual : 0);
  var html = '';
  if (precoAtual > 0) {
    html = '<div style="font-size:13px;color:#888;margin-bottom:4px;">Produto: R$ ' + precoAtual.toFixed(2).replace('.', ',') + '</div>';
    if (freteAtual > 0) {
      html += '<div style="font-size:13px;color:#888;margin-bottom:4px;">Frete: R$ ' + freteAtual.toFixed(2).replace('.', ',') + '</div>';
    } else if (freteAtual === -1) {
      html += '<div style="font-size:13px;color:#00cc66;margin-bottom:4px;">Frete: GRÁTIS</div>';
    }
    html += '<div style="font-size:13px;color:#00cc66;margin-bottom:4px;">Desconto PIX (5%): - R$ ' + desconto.toFixed(2).replace('.', ',') + '</div>';
    var totalFinal = freteAtual === -1 ? (precoAtual - desconto) : totalPix;
    html += '<div style="font-size:26px;font-weight:800;color:#cc0000;">Total PIX: R$ ' + totalFinal.toFixed(2).replace('.', ',') + '</div>';
  }
  document.getElementById('pixTotal').innerHTML = html;

  var msgFrete = freteAtual > 0 ? ' + frete R$ ' + freteAtual.toFixed(2).replace('.', ',') : (freteAtual === -1 ? ' + frete GRÁTIS' : '');
  var link = 'https://wa.me/5511947871294?text=' + encodeURIComponent(
    'Olá! Quero comprar: ' + produtoAtual +
    '\nValor: R$ ' + precoAtual.toFixed(2).replace('.', ',') +
    msgFrete + '\nVou pagar via PIX.'
  );
  document.getElementById('modalWhatsapp').href = link;
}

function atualizarCartaoTotal() {
  var frete = freteAtual > 0 ? freteAtual : 0;
  var total = precoAtual + frete;
  var html = '';
  if (precoAtual > 0) {
    html = '<div style="font-size:13px;color:#888;margin-bottom:4px;">Produto: R$ ' + precoAtual.toFixed(2).replace('.', ',') + '</div>';
    if (freteAtual > 0) html += '<div style="font-size:13px;color:#888;margin-bottom:4px;">Frete: R$ ' + freteAtual.toFixed(2).replace('.', ',') + '</div>';
    else if (freteAtual === -1) html += '<div style="font-size:13px;color:#00cc66;margin-bottom:4px;">Frete: GRÁTIS</div>';
    html += '<div style="font-size:26px;font-weight:800;color:#cc0000;">Total Cartão: R$ ' + (freteAtual === -1 ? precoAtual : total).toFixed(2).replace('.', ',') + '</div>';
  }
  if (document.getElementById('cartaoTotal')) document.getElementById('cartaoTotal').innerHTML = html;

  var parcelas = total > 0 ? 'até 3x de R$ ' + (total / 3).toFixed(2).replace('.', ',') + ' sem juros' : '-';
  if (document.getElementById('cartaoProduto')) document.getElementById('cartaoProduto').textContent = produtoAtual;
  if (document.getElementById('cartaoFrete')) {
    document.getElementById('cartaoFrete').textContent = freteAtual === -1 ? 'GRÁTIS' : (freteAtual > 0 ? 'R$ ' + freteAtual.toFixed(2).replace('.', ',') : 'a calcular');
  }
  if (document.getElementById('cartaoParcelas')) document.getElementById('cartaoParcelas').textContent = parcelas;

  var msgFrete = freteAtual > 0 ? ' + frete R$ ' + freteAtual.toFixed(2).replace('.', ',') : (freteAtual === -1 ? ' + frete GRÁTIS' : '');
  var link = 'https://wa.me/5511947871294?text=' + encodeURIComponent(
    'Olá! Quero comprar: ' + produtoAtual +
    '\nValor: R$ ' + precoAtual.toFixed(2).replace('.', ',') +
    msgFrete + '\nVou pagar com Cartão de Crédito.'
  );
  if (document.getElementById('modalWhatsappCartao')) document.getElementById('modalWhatsappCartao').href = link;
}

function registrarPedido(metodo) {
  if (!currentUser) return;
  var frete = freteAtual === -1 ? 0 : (freteAtual > 0 ? freteAtual : 0);
  var desconto = metodo === 'pix' ? precoAtual * 0.05 : 0;
  var total = precoAtual - desconto + frete;
  fetch('/api/user/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: produtoAtual, price: precoAtual, shipping: frete, total: total, payment_method: metodo })
  }).catch(function(){});
}

function copiarPix() {
  var texto = '+55 (11) 94787-1294';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(function() {
      var btn = document.querySelector('.btn-copiar');
      var original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.style.background = '#00cc66';
      setTimeout(function() { btn.textContent = original; btn.style.background = ''; }, 2000);
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
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
  if (cep.length !== 8) { el.innerHTML = '<p class="frete-erro">CEP inválido. Digite 8 números.</p>'; return; }
  el.innerHTML = '<p style="color:#aaa;font-size:13px;">Buscando endereço...</p>';
  fetch('https://viacep.com.br/ws/' + cep + '/json/')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.erro) { el.innerHTML = '<p class="frete-erro">CEP não encontrado. Verifique e tente novamente.</p>'; return; }
      var uf = data.uf, cidade = data.localidade;
      var bairro = data.bairro ? ' - ' + data.bairro : '';
      var opcoes = calcularOpcoesFrete(uf, cidade);
      var html = '<div class="frete-address">📍 ' + cidade + bairro + ' / ' + uf + '</div><div class="frete-opcoes">';
      opcoes.forEach(function(op) {
        html += '<div class="frete-opcao"><div><div class="frete-nome">' + op.nome + '</div><div class="frete-prazo">' + op.prazo + '</div></div>';
        html += op.valor === 0 ? '<span class="frete-gratis">GRÁTIS</span>' : '<span class="frete-valor">R$ ' + op.valor.toFixed(2).replace('.', ',') + '</span>';
        html += '</div>';
      });
      html += '</div>';
      el.innerHTML = html;
      if (isModal && opcoes.length > 0) {
        freteAtual = opcoes[0].valor === 0 ? -1 : opcoes[0].valor;
        atualizarPixTotal();
        atualizarCartaoTotal();
      }
    })
    .catch(function() { el.innerHTML = '<p class="frete-erro">Erro ao buscar CEP. Verifique sua conexão.</p>'; });
}

function calcularOpcoesFrete(uf, cidade) {
  var isSpCapital = uf === 'SP' && (cidade.toLowerCase().includes('são paulo') || cidade.toLowerCase().includes('sao paulo'));
  var isSP = uf === 'SP', isSudeste = ['SP','RJ','MG','ES'].includes(uf), isSul = ['PR','SC','RS'].includes(uf);
  var isCentroOeste = ['GO','MT','MS','DF'].includes(uf), isNordeste = ['BA','SE','AL','PE','PB','RN','CE','PI','MA'].includes(uf);
  var isNorte = ['AM','PA','AC','RO','RR','TO','AP'].includes(uf);
  if (isSpCapital) return [{nome:'Motoboy (São Paulo Capital)',prazo:'1–2 dias úteis',valor:0},{nome:'Correios PAC',prazo:'2–4 dias úteis',valor:15.90},{nome:'Correios SEDEX',prazo:'1–2 dias úteis',valor:25.90}];
  if (isSP) return [{nome:'Correios PAC',prazo:'2–4 dias úteis',valor:18.90},{nome:'Correios SEDEX',prazo:'1–3 dias úteis',valor:29.90}];
  if (isSudeste || isSul) return [{nome:'Correios PAC',prazo:'3–6 dias úteis',valor:22.90},{nome:'Correios SEDEX',prazo:'2–4 dias úteis',valor:34.90}];
  if (isCentroOeste) return [{nome:'Correios PAC',prazo:'5–8 dias úteis',valor:26.90},{nome:'Correios SEDEX',prazo:'3–5 dias úteis',valor:39.90}];
  if (isNordeste) return [{nome:'Correios PAC',prazo:'6–10 dias úteis',valor:28.90},{nome:'Correios SEDEX',prazo:'4–7 dias úteis',valor:44.90}];
  if (isNorte) return [{nome:'Correios PAC',prazo:'8–14 dias úteis',valor:34.90},{nome:'Correios SEDEX',prazo:'5–9 dias úteis',valor:54.90}];
  return [{nome:'Correios PAC',prazo:'A consultar',valor:24.90},{nome:'Correios SEDEX',prazo:'A consultar',valor:39.90}];
}

function formatarCep(input) {
  var v = input.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5);
  input.value = v;
}

function toggleMenu() {
  document.getElementById('mobileNav').classList.toggle('open');
}

function toggleFaq(btn) {
  var answer = btn.nextElementSibling, icon = btn.querySelector('.faq-icon'), isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-answer.open').forEach(function(a) { a.classList.remove('open'); });
  document.querySelectorAll('.faq-icon').forEach(function(i) { i.textContent = '+'; });
  if (!isOpen) { answer.classList.add('open'); icon.textContent = '−'; }
}

function subscribeNewsletter(e) {
  e.preventDefault();
  alert('Cadastro realizado com sucesso! Em breve você receberá nossas novidades.');
  e.target.reset();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { fecharModal(); fecharAuth(); }
});

/* ===== FORMATAÇÃO ===== */
function formatarCPFInput(input) {
  var v = input.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
  else if(v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/,'$1.$2.$3');
  else if(v.length > 3) v = v.replace(/(\d{3})(\d+)/,'$1.$2');
  input.value = v;
}

function formatarTelInput(input) {
  var v = input.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d+)/,'($1) $2-$3');
  else if(v.length > 2) v = v.replace(/(\d{2})(\d+)/,'($1) $2');
  input.value = v;
}

/* ===== AUTENTICAÇÃO ===== */
var currentUser = null;

function abrirAuth() {
  mudarAba('entrar');
  document.getElementById('authOverlay').classList.add('open');
  document.getElementById('authModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.getElementById('authModal').classList.remove('open');
  document.body.style.overflow = '';
}

function mudarAba(aba) {
  var views = ['authEntrar','authCadastrar','authEsqueci'];
  views.forEach(function(v) {
    var el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });
  var show = aba === 'entrar' ? 'authEntrar' : (aba === 'esqueci' ? 'authEsqueci' : 'authCadastrar');
  var el = document.getElementById(show);
  if (el) el.style.display = 'block';
  document.getElementById('tabEntrar').classList.toggle('active', aba === 'entrar');
  document.getElementById('tabCadastrar').classList.toggle('active', aba === 'cadastrar');
}

function mostrarEsqueciSenha() {
  mudarAba('esqueci');
}

function voltarLogin() {
  mudarAba('entrar');
}

function toggleSenha(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.style.opacity = input.type === 'text' ? '1' : '0.5';
}

/* Social login - redirects to OAuth providers */
function loginSocial(provedor) {
  if (provedor === 'google') {
    window.location.href = '/auth/google';
  } else {
    var nomes = {microsoft:'Microsoft', apple:'Apple', facebook:'Facebook', yahoo:'Yahoo'};
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 22px;border-radius:10px;z-index:9999;font-size:13px;max-width:340px;text-align:center;border:1px solid #333;box-shadow:0 6px 24px rgba(0,0,0,0.5);';
    toast.innerHTML = 'Login com <strong>' + (nomes[provedor]||provedor) + '</strong> em breve.<br><span style="color:#aaa;font-size:12px;">Por enquanto, use e-mail ou Google.</span>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(function(){toast.remove();},350); }, 3000);
  }
}

async function submitLogin(e) {
  e.preventDefault();
  var btn = document.getElementById('btnLogin');
  var erroEl = document.getElementById('loginErro');
  erroEl.style.display = 'none';
  btn.textContent = 'Entrando...'; btn.disabled = true;
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginSenha').value })
    });
    var data = await res.json();
    if (data.success) { atualizarEstadoLogin(data.user); fecharAuth(); }
    else { erroEl.textContent = data.error || 'Credenciais inválidas.'; erroEl.style.display = 'block'; }
  } catch(err) { erroEl.textContent = 'Erro de conexão.'; erroEl.style.display = 'block'; }
  btn.textContent = 'Entrar na Conta'; btn.disabled = false;
}

async function submitCadastro(e) {
  e.preventDefault();
  var btn = document.getElementById('btnCadastro');
  var erroEl = document.getElementById('cadastroErro');
  erroEl.style.display = 'none';
  var email = document.getElementById('cadastroEmail').value;
  var emailConf = document.getElementById('cadastroEmailConf').value;
  var senha = document.getElementById('cadastroSenha').value;
  var senhaConf = document.getElementById('cadastroSenhaConf').value;
  if (email !== emailConf) { erroEl.textContent = 'Os e-mails não conferem.'; erroEl.style.display = 'block'; return; }
  if (senha !== senhaConf) { erroEl.textContent = 'As senhas não conferem.'; erroEl.style.display = 'block'; return; }
  btn.textContent = 'Cadastrando...'; btn.disabled = true;
  try {
    var res = await fetch('/api/auth/register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        name: document.getElementById('cadastroNome').value,
        email: email, password: senha,
        cpf: document.getElementById('cadastroCpf').value,
        rg: document.getElementById('cadastroRg').value,
        phone: document.getElementById('cadastroCelular').value,
        birth_date: document.getElementById('cadastroNascimento').value,
        newsletter: document.getElementById('cadastroNewsletter').checked,
        marketing: document.getElementById('cadastroMarketing').checked
      })
    });
    var data = await res.json();
    if (data.success) { atualizarEstadoLogin(data.user); fecharAuth(); }
    else { erroEl.textContent = data.error || 'Erro ao criar conta.'; erroEl.style.display = 'block'; }
  } catch(err) { erroEl.textContent = 'Erro de conexão.'; erroEl.style.display = 'block'; }
  btn.textContent = 'CONCLUIR CADASTRO'; btn.disabled = false;
}

async function submitEsqueciSenha(e) {
  e.preventDefault();
  var btn = document.getElementById('btnEsqueci');
  var msgEl = document.getElementById('esqueciMsg');
  var linkEl = document.getElementById('esqueciLink');
  msgEl.className = 'conta-msg'; msgEl.textContent = '';
  linkEl.style.display = 'none';
  btn.textContent = 'Enviando...'; btn.disabled = true;
  try {
    var res = await fetch('/api/auth/forgot-password', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: document.getElementById('esqueciEmail').value })
    });
    var data = await res.json();
    if (data.success) {
      msgEl.textContent = 'E-mail validado! Clique abaixo para redefinir sua senha.';
      msgEl.className = 'conta-msg conta-msg-ok';
      if (data.resetLink) {
        linkEl.style.display = 'block';
        linkEl.innerHTML = '<a href="' + data.resetLink + '" class="auth-submit" style="display:block;text-align:center;text-decoration:none;margin-top:8px;">Redefinir Senha</a>';
      }
    } else {
      msgEl.textContent = data.error;
      msgEl.className = 'conta-msg conta-msg-err';
    }
  } catch(err) { msgEl.textContent = 'Erro de conexão.'; msgEl.className = 'conta-msg conta-msg-err'; }
  btn.textContent = 'Enviar link de redefinição'; btn.disabled = false;
}

function atualizarEstadoLogin(usuario) {
  if (!usuario) return;
  currentUser = usuario;
  var iniciais = usuario.name.split(' ').map(function(p){return p[0];}).slice(0,2).join('').toUpperCase();
  document.getElementById('userAvatar').textContent = iniciais;
  document.getElementById('userDropdownName').textContent = usuario.name;
  document.getElementById('userDropdownEmail').textContent = usuario.email;
  document.getElementById('userArea').style.display = 'none';
  document.getElementById('userLogged').style.display = 'flex';
}

async function sairConta(e) {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  document.getElementById('userArea').style.display = 'flex';
  document.getElementById('userLogged').style.display = 'none';
  document.getElementById('userDropdown').classList.remove('open');
}

function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}

document.addEventListener('click', function(e) {
  var logged = document.getElementById('userLogged');
  if (logged && !logged.contains(e.target)) {
    var dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('open');
  }
});

/* Verificar sessão ao carregar */
(function() {
  fetch('/api/auth/me').then(function(res){return res.json();}).then(function(data){
    if (data.user) atualizarEstadoLogin(data.user);
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success' && data.user) {
      history.replaceState({}, '', '/');
    }
    if (params.get('auth') === 'login') {
      abrirAuth();
      history.replaceState({}, '', '/');
    }
    if (params.get('google') === 'not-configured') {
      history.replaceState({}, '', '/');
      setTimeout(function() {
        abrirAuth();
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:14px 22px;border-radius:10px;z-index:9999;font-size:13px;max-width:360px;text-align:center;border:1px solid #444;box-shadow:0 6px 24px rgba(0,0,0,0.5);';
        toast.innerHTML = 'Login com Google indisponível no momento.<br><span style="color:#aaa;font-size:12px;">Use seu e-mail e senha para entrar.</span>';
        document.body.appendChild(toast);
        setTimeout(function() { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(function(){toast.remove();},350); }, 4000);
      }, 200);
    }
  }).catch(function(){});
})();
