require('module').createRequire(require('path').join(__dirname, '..', 'backend', 'package.json'))('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const { createRequire } = require('module');
const backendRequire = createRequire(require('path').join(__dirname, '..', 'backend', 'package.json'));
const mysql = backendRequire('mysql2/promise');
const bcrypt = backendRequire('bcryptjs');

(async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const senha = String(process.env.ADMIN_PASSWORD || '');
  const nome = String(process.env.ADMIN_NAME || 'Administrador SENAI Express');
  if (!email || !senha || senha.length < 10) {
    console.error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 10 caracteres) em backend/.env.');
    process.exit(1);
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'senai_express_v5_novo'
  });
  try {
    const hash = await bcrypt.hash(senha, 12);
    const [rows] = await db.query('SELECT id FROM usuarios WHERE email=?', [email]);
    if (rows.length) {
      await db.query("UPDATE usuarios SET nome=?,senha_hash=?,funcao='admin',ativo=TRUE WHERE email=?", [nome, hash, email]);
      console.log(`Conta administrativa atualizada: ${email}`);
    } else {
      await db.query("INSERT INTO usuarios (nome,email,senha_hash,funcao,ativo) VALUES (?,?,?,'admin',TRUE)", [nome,email,hash]);
      console.log(`Conta administrativa criada: ${email}`);
    }
  } finally { await db.end(); }
})().catch(e => { console.error('Falha ao criar admin:', e.message); process.exit(1); });
