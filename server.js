const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const pgSession = require('connect-pg-simple')(session);

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const isSecure = process.env.NODE_ENV === 'production';
app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'pods011secret2025xk9',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = res.rows[0];
    if (!user) return done(null, false, { message: 'E-mail não encontrado.' });
    if (!user.password_hash) return done(null, false, { message: 'Esta conta usa login social. Use Google ou outro provedor.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return done(null, false, { message: 'Senha incorreta.' });
    return done(null, user);
  } catch (e) { return done(e); }
}));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let res = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['google', profile.id]);
      if (res.rows[0]) return done(null, res.rows[0]);
      res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (res.rows[0]) {
        await pool.query('UPDATE users SET provider=$1, provider_id=$2, avatar_url=$3 WHERE id=$4', ['google', profile.id, profile.photos[0]?.value, res.rows[0].id]);
        return done(null, res.rows[0]);
      }
      const insert = await pool.query(
        'INSERT INTO users (name, email, provider, provider_id, avatar_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [profile.displayName, email, 'google', profile.id, profile.photos[0]?.value]
      );
      return done(null, insert.rows[0]);
    } catch (e) { return done(e); }
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, res.rows[0] || null);
  } catch (e) { done(e); }
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Não autenticado' });
}

/* ===== AUTH ROUTES ===== */

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, cpf, rg, phone, birth_date, newsletter, marketing } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows[0]) return res.status(409).json({ error: 'E-mail já cadastrado.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, cpf, rg, phone, birth_date, newsletter, marketing) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, email.toLowerCase(), hash, cpf || null, rg || null, phone || null, birth_date || null, newsletter || false, marketing || false]
    );
    const user = result.rows[0];
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao fazer login.' });
      res.json({ success: true, user: safeUser(user) });
    });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

app.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ error: 'Erro interno.' });
    if (!user) return res.status(401).json({ error: info?.message || 'Credenciais inválidas.' });
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao fazer login.' });
      res.json({ success: true, user: safeUser(user) });
    });
  })(req, res, next);
});

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  res.json({ user: safeUser(req.user) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });
  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'E-mail não encontrado.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [result.rows[0].id]);
    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)', [result.rows[0].id, token, expires]);
    const resetLink = `/redefinir-senha.html?token=${token}`;
    res.json({ success: true, resetLink, message: 'Link de redefinição gerado. Copie e acesse o link abaixo.' });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
  try {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Link inválido ou expirado.' });
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, result.rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [result.rows[0].id]);
    res.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

/* ===== GOOGLE OAUTH ===== */
app.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('/?google=not-configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
app.get('/auth/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/?auth=error');
  passport.authenticate('google', { failureRedirect: '/?auth=error' }, (err, user) => {
    if (err || !user) return res.redirect('/?auth=error');
    req.login(user, (loginErr) => {
      if (loginErr) return res.redirect('/?auth=error');
      res.redirect('/?auth=success');
    });
  })(req, res, next);
});

/* ===== USER PROFILE ROUTES ===== */
app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
  const { name, phone, birth_date, cpf, rg, newsletter, marketing } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, phone=$2, birth_date=$3, cpf=$4, rg=$5, newsletter=$6, marketing=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, phone || null, birth_date || null, cpf || null, rg || null, newsletter || false, marketing || false, req.user.id]
    );
    res.json({ success: true, user: safeUser(result.rows[0]) });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar perfil.' }); }
});

app.put('/api/user/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Senhas obrigatórias.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres.' });
  try {
    const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0].password_hash) return res.status(400).json({ error: 'Conta social não tem senha para alterar.' });
    const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

/* ===== ORDERS ===== */
app.get('/api/user/orders', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ orders: result.rows });
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar pedidos.' }); }
});

app.post('/api/user/orders', requireAuth, async (req, res) => {
  const { product, price, shipping, total, payment_method } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO orders (user_id, product, price, shipping, total, payment_method) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, product, price, shipping || 0, total, payment_method || 'pix']
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Erro ao salvar pedido.' }); }
});

/* ===== FAVORITES ===== */
app.get('/api/user/favorites', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ favorites: result.rows });
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar favoritos.' }); }
});

app.post('/api/user/favorites', requireAuth, async (req, res) => {
  const { product_name, product_price, product_image } = req.body;
  try {
    await pool.query(
      'INSERT INTO favorites (user_id, product_name, product_price, product_image) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, product_name) DO NOTHING',
      [req.user.id, product_name, product_price || null, product_image || null]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao adicionar favorito.' }); }
});

app.delete('/api/user/favorites/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover favorito.' }); }
});

/* ===== ADDRESSES ===== */
app.get('/api/user/addresses', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    res.json({ addresses: result.rows });
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar endereços.' }); }
});

app.post('/api/user/addresses', requireAuth, async (req, res) => {
  const { label, cep, street, number, complement, neighborhood, city, state, is_default } = req.body;
  try {
    if (is_default) await pool.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
    const result = await pool.query(
      'INSERT INTO addresses (user_id, label, cep, street, number, complement, neighborhood, city, state, is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, label || 'Casa', cep, street, number, complement || null, neighborhood, city, state, is_default || false]
    );
    res.json({ success: true, address: result.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Erro ao salvar endereço.' }); }
});

app.delete('/api/user/addresses/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover endereço.' }); }
});

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  return safe;
}

app.listen(5000, () => console.log('011 dos Pods rodando na porta 5000'));
