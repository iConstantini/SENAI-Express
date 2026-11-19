require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { authRequired, adminRequired } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1.5mb' }));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));

app.post('/api/uploads/avatar', async (req, res) => {
  try {
    const raw = String(req.body?.base64 || '');
    const kind = String(req.body?.mimeType || 'image/jpeg');
    if (!['image/jpeg','image/png'].includes(kind) || raw.length > 850000 || !/^[A-Za-z0-9+/=]+$/.test(raw)) return res.status(400).json({error:'Foto inválida ou muito grande (máximo 600 KB).'});
    const bytes = Buffer.from(raw, 'base64');
    if (!bytes.length || bytes.length > 600000) return res.status(400).json({error:'Foto muito grande.'});
    const jpg = bytes[0]===0xff && bytes[1]===0xd8;
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!(kind==='image/jpeg' && jpg) && !(kind==='image/png' && png)) return res.status(400).json({error:'Formato de imagem inválido.'});
    const name = crypto.randomUUID() + (jpg ? '.jpg' : '.png');
    await fs.promises.writeFile(path.join(uploadDir,name),bytes,{flag:'wx'});
    res.status(201).json({url:`${req.protocol}://${req.get('host')}/uploads/${name}`});
  } catch(e) { res.status(500).json({error:'Falha ao salvar imagem.'}); }
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const money = n => Math.round(Number(n) * 100) / 100;

app.get('/api/health', asyncRoute(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true, service: 'SENAI Express API', database: 'connected' });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const fotoUrl = String(req.body.foto_url || '');
  if (fotoUrl && (!/^https?:\/\/[^/]+\/uploads\/[a-f0-9-]+\.(jpg|png)$/.test(fotoUrl) || fotoUrl.length > 500)) return res.status(400).json({error:'Foto inválida.'});
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8) {
    return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
  }
  const [exists] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (exists.length) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  const hash = await bcrypt.hash(senha, 12);
  const [result] = await db.query(
    "INSERT INTO usuarios (nome,email,senha_hash,funcao,foto_url) VALUES (?,?,?,'aluno',?)",
    [nome, email, hash, fotoUrl || null]
  );
  res.status(201).json({ message: 'Cadastro realizado. Faça login.', id: result.insertId });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const [rows] = await db.query('SELECT id,nome,email,senha_hash,funcao,ativo FROM usuarios WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !user.ativo || !(await bcrypt.compare(senha, user.senha_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }
  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, funcao: user.funcao },
    process.env.JWT_SECRET, { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, funcao: user.funcao } });
}));

// V4: perfil, notificações e auditoria administrativa.
app.get('/api/profile', authRequired, asyncRoute(async (req,res)=>{
  const [[u]]=await db.query('SELECT id,nome,email,funcao,foto_url,notificacoes_ativas,criado_em FROM usuarios WHERE id=?',[req.user.id]);
  if(!u) return res.status(404).json({error:'Usuário não encontrado.'});
  res.json(u);
}));
app.patch('/api/profile',authRequired,asyncRoute(async(req,res)=>{
  const nome=String(req.body.nome||'').trim();
  const foto=req.body.foto_url==null?null:String(req.body.foto_url).trim();
  if(nome.length<2||nome.length>120|| (foto && (foto.length>500||!/^https?:\/\//i.test(foto)))) return res.status(400).json({error:'Nome ou URL da foto inválidos.'});
  await db.query('UPDATE usuarios SET nome=?,foto_url=?,notificacoes_ativas=? WHERE id=?',[nome,foto,req.body.notificacoes_ativas!==false,req.user.id]);
  res.json({ok:true});
}));
app.get('/api/notifications',authRequired,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT id,titulo,mensagem,lida,criado_em FROM notificacoes WHERE usuario_id=? ORDER BY criado_em DESC LIMIT 80',[req.user.id]);res.json(rows);
}));
app.patch('/api/notifications/:id/read',authRequired,asyncRoute(async(req,res)=>{
  await db.query('UPDATE notificacoes SET lida=TRUE WHERE id=? AND usuario_id=?',[req.params.id,req.user.id]);res.json({ok:true});
}));
app.get('/api/admin/audit',authRequired,adminRequired,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT a.id,a.acao,a.entidade,a.entidade_id,a.detalhes,a.criado_em,u.nome AS responsavel FROM auditoria_admin a LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.id DESC LIMIT 100');res.json(rows);
}));
app.get('/api/admin/transactions',authRequired,adminRequired,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT p.id,p.pedido_id,p.metodo,p.status,p.valor,p.referencia,p.criado_em FROM pagamentos p ORDER BY p.id DESC LIMIT 100');res.json(rows);
}));
app.get('/api/categories', asyncRoute(async (req, res) => {
  const [rows] = await db.query('SELECT id,nome,slug FROM categorias WHERE ativa=TRUE ORDER BY ordem,nome');
  res.json(rows);
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const params = [];
  let sql = `SELECT p.id,p.categoria_id,p.nome,p.descricao,p.preco,p.imagem_url,p.disponivel,
                    c.nome AS categoria_nome,c.slug AS categoria_slug
             FROM produtos p JOIN categorias c ON c.id=p.categoria_id WHERE 1=1`;
  if (req.query.category) { sql += ' AND c.slug=?'; params.push(String(req.query.category)); }
  if (req.query.search) { sql += ' AND (p.nome LIKE ? OR p.descricao LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  sql += ' ORDER BY c.ordem,p.nome';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

app.get('/api/slots', asyncRoute(async (req, res) => {
  const [rows] = await db.query(
    `SELECT h.id,h.inicio,h.fim,h.capacidade,
      (SELECT COUNT(*) FROM pedidos p WHERE p.horario_id=h.id AND p.status NOT IN ('cancelado','entregue')) AS ocupadas
     FROM horarios_retirada h WHERE h.ativo=TRUE AND h.fim > NOW()
     ORDER BY h.inicio LIMIT 1500`
  );
  res.json(rows.map(r => ({ ...r, vagas: Math.max(0, r.capacidade - r.ocupadas) })).filter(r => r.vagas > 0));
}));

app.post('/api/orders', authRequired, asyncRoute(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const horarioId = req.body.horario_id ? Number(req.body.horario_id) : null;
  const allowedMethods = ['pix_simulado', 'cartao_simulado', 'pagar_na_retirada'];
  const metodo = String(req.body.metodo || 'pix_simulado');
  if (!allowedMethods.includes(metodo)) return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  const observacao = String(req.body.observacao || '').slice(0, 500);
  if (!items.length || items.length > 40) return res.status(400).json({ error: 'Carrinho vazio ou com itens demais.' });
  const normalized = new Map();
  for (const item of items) {
    const id = Number(item.produto_id), qtd = Number(item.quantidade);
    if (!Number.isInteger(id) || !Number.isInteger(qtd) || qtd < 1 || qtd > 30) return res.status(400).json({ error: 'Item ou quantidade inválidos.' });
    normalized.set(id, (normalized.get(id) || 0) + qtd);
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (horarioId) {
      const [slots] = await conn.query('SELECT * FROM horarios_retirada WHERE id=? AND ativo=TRUE AND fim>NOW() FOR UPDATE', [horarioId]);
      if (!slots.length) throw Object.assign(new Error('Horário de retirada inválido.'), { status: 400 });
      const [count] = await conn.query("SELECT COUNT(*) AS n FROM pedidos WHERE horario_id=? AND status NOT IN ('cancelado','entregue')", [horarioId]);
      if (Number(count[0].n) >= Number(slots[0].capacidade)) throw Object.assign(new Error('Este horário acabou de ficar sem vagas. Escolha outro.'), { status: 409 });
    }
    const ids = [...normalized.keys()];
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await conn.query(`SELECT id,nome,preco,disponivel,estoque FROM produtos WHERE id IN (${placeholders}) FOR UPDATE`, ids);
    if (products.length !== ids.length || products.some(p => !p.disponivel)) throw Object.assign(new Error('Um ou mais produtos não estão disponíveis.'), { status: 400 });
    let total = 0;
    const lineItems = products.map(p => {
      const quantidade = normalized.get(Number(p.id));
      if (p.estoque !== null && Number(p.estoque) < quantidade) throw Object.assign(new Error(`Estoque insuficiente para ${p.nome}.`), { status: 409 });
      const preco = money(p.preco), totalItem = money(preco * quantidade);
      total = money(total + totalItem);
      return { ...p, quantidade, preco, totalItem };
    });
    for (const p of lineItems) {
      if (p.estoque !== null) await conn.query('UPDATE produtos SET estoque=estoque-? WHERE id=?', [p.quantidade, p.id]);
    }
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
    const pedidoStatus = metodo === 'pagar_na_retirada' ? 'aguardando_pagamento' : 'confirmado';
    const [order] = await conn.query(
      "INSERT INTO pedidos (usuario_id,horario_id,codigo_retirada,status,subtotal,total,observacao) VALUES (?,?,?,?,?,?,?)",
      [req.user.id, horarioId, codigo, pedidoStatus, total, total, observacao]
    );
    for (const p of lineItems) {
      await conn.query('INSERT INTO itens_pedido (pedido_id,produto_id,nome_produto,preco_unitario,quantidade,total_item) VALUES (?,?,?,?,?,?)',
        [order.insertId, p.id, p.nome, p.preco, p.quantidade, p.totalItem]);
    }
    const referencia = `DEMO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const statusPagamento = metodo === 'pagar_na_retirada' ? 'pendente_retirada' : 'simulado_aprovado';
    await conn.query('INSERT INTO pagamentos (pedido_id,metodo,status,valor,referencia) VALUES (?,?,?,?,?)',
      [order.insertId, metodo, statusPagamento, total, referencia]);
    await conn.query('INSERT INTO historico_pedidos (pedido_id,usuario_responsavel,status_anterior,status_novo,observacao) VALUES (?,?,NULL,?,?)',
      [order.insertId, req.user.id, 'confirmado', 'Pedido criado pelo aplicativo']);
    await conn.commit();
    res.status(201).json({
      id: order.insertId, codigo_retirada: codigo, status: pedidoStatus, total,
      metodo_pagamento: metodo, pagamento: statusPagamento,
      // Código didático, não é um QR Code nem uma cobrança Pix válida.
      pix_copia_cola: metodo === 'pix_simulado' ? `SENAI-EXPRESS-DEMO-${codigo}-${total.toFixed(2)}` : null
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

app.get('/api/orders/mine', authRequired, asyncRoute(async (req, res) => {
  const [orders] = await db.query(
    `SELECT p.id,p.codigo_retirada,p.status,p.subtotal,p.total,p.criado_em,p.observacao,h.inicio AS retirada_inicio,h.fim AS retirada_fim
     FROM pedidos p LEFT JOIN horarios_retirada h ON h.id=p.horario_id
     WHERE p.usuario_id=? ORDER BY p.criado_em DESC LIMIT 100`, [req.user.id]
  );
  for (const order of orders) {
    const [items] = await db.query('SELECT nome_produto,preco_unitario,quantidade,total_item FROM itens_pedido WHERE pedido_id=?', [order.id]);
    order.itens = items;
  }
  res.json(orders);
}));

app.get('/api/admin/orders', authRequired, adminRequired, asyncRoute(async (req, res) => {
  const [orders] = await db.query(
    `SELECT p.id,p.codigo_retirada,p.status,p.total,p.criado_em,u.nome AS cliente,u.email,
      h.inicio AS retirada_inicio
     FROM pedidos p JOIN usuarios u ON u.id=p.usuario_id LEFT JOIN horarios_retirada h ON h.id=p.horario_id
     ORDER BY FIELD(p.status,'confirmado','em_preparo','pronto','aguardando_pagamento','entregue','cancelado'),p.criado_em ASC LIMIT 200`
  );
  for (const order of orders) {
    const [items] = await db.query('SELECT nome_produto,quantidade FROM itens_pedido WHERE pedido_id=?', [order.id]);
    order.itens = items;
  }
  res.json(orders);
}));

app.patch('/api/admin/orders/:id/status', authRequired, adminRequired, asyncRoute(async (req, res) => {
  const allowed = ['confirmado','em_preparo','pronto','entregue','cancelado'];
  const status = String(req.body.status || '');
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id,status FROM pedidos WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows.length) throw Object.assign(new Error('Pedido não encontrado.'), { status: 404 });
    const old = rows[0].status;
    if (old === 'cancelado' && status !== 'cancelado') {
      throw Object.assign(new Error('Um pedido cancelado não pode ser reaberto.'), { status: 409 });
    }
    if (status === 'cancelado' && old !== 'cancelado') {
      const [items] = await conn.query(
        'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id=?', [req.params.id]
      );
      for (const item of items) {
        await conn.query(
          'UPDATE produtos SET estoque=estoque+? WHERE id=? AND estoque IS NOT NULL',
          [item.quantidade, item.produto_id]
        );
      }
      await conn.query("UPDATE pagamentos SET status='cancelado' WHERE pedido_id=?", [req.params.id]);
    }
    await conn.query('UPDATE pedidos SET status=? WHERE id=?', [status, req.params.id]);
    await conn.query('INSERT INTO historico_pedidos (pedido_id,usuario_responsavel,status_anterior,status_novo,observacao) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, old, status, status === 'cancelado' ? 'Pedido cancelado; estoque devolvido.' : 'Atualizado pelo painel administrativo']);
    if(old!==status) {
      await conn.query('INSERT INTO notificacoes(usuario_id,titulo,mensagem) SELECT usuario_id,?,? FROM pedidos WHERE id=?',
        ['Atualização do pedido',`Seu pedido #${req.params.id} agora está: ${status.replace(/_/g,' ')}.`,req.params.id]);
      await conn.query('INSERT INTO auditoria_admin(usuario_id,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?)',
        [req.user.id,'alterar_status','pedido',req.params.id,JSON.stringify({de:old,para:status})]);
    }
    await conn.commit();
    res.json({ ok: true, id: Number(req.params.id), status });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}));

app.post('/api/admin/products', authRequired, adminRequired, asyncRoute(async (req, res) => {
  const categoriaId = Number(req.body.categoria_id);
  const nome = String(req.body.nome || '').trim();
  const descricao = String(req.body.descricao || '').trim();
  const preco = Number(req.body.preco);
  const estoque = req.body.estoque == null || req.body.estoque === '' ? null : Number(req.body.estoque);
  if (!Number.isInteger(categoriaId) || categoriaId < 1 || nome.length < 2 || nome.length > 120 || !Number.isFinite(preco) || preco < 0 || (estoque !== null && (!Number.isInteger(estoque) || estoque < 0))) {
    return res.status(400).json({ error: 'Informe categoria, nome, preço e estoque válidos.' });
  }
  const [result] = await db.query('INSERT INTO produtos (categoria_id,nome,descricao,preco,imagem_url,disponivel,estoque) VALUES (?,?,?,?,?,?,?)',
    [categoriaId,nome,descricao || null,preco,req.body.imagem_url || null,req.body.disponivel !== false,estoque]);
  await db.query('INSERT INTO auditoria_admin(usuario_id,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?)',[req.user.id,'criar','produto',result.insertId,JSON.stringify({nome,preco})]);
  res.status(201).json({ id: result.insertId });
}));

app.patch('/api/admin/products/:id', authRequired, adminRequired, asyncRoute(async (req, res) => {
  const fields = [], values = [];
  const allowed = ['nome','descricao','preco','imagem_url','disponivel','estoque','categoria_id'];
  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    let value = req.body[key];
    if (key === 'nome') {
      value = String(value).trim();
      if (value.length < 2 || value.length > 120) return res.status(400).json({ error: 'Nome do produto inválido.' });
    }
    if (key === 'preco') {
      value = Number(value);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Preço inválido.' });
    }
    if (key === 'estoque' && value !== null) {
      value = Number(value);
      if (!Number.isInteger(value) || value < 0) return res.status(400).json({ error: 'Estoque deve ser um número inteiro positivo ou nulo.' });
    }
    if (key === 'categoria_id') {
      value = Number(value);
      if (!Number.isInteger(value) || value < 1) return res.status(400).json({ error: 'Categoria inválida.' });
    }
    if (key === 'disponivel') value = Boolean(value);
    fields.push(`${key}=?`);
    values.push(value);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo enviado.' });
  values.push(req.params.id);
  const [result] = await db.query(`UPDATE produtos SET ${fields.join(',')} WHERE id=?`, values);
  if (!result.affectedRows) return res.status(404).json({ error: 'Produto não encontrado.' });
  await db.query('INSERT INTO auditoria_admin(usuario_id,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?)',[req.user.id,'editar','produto',req.params.id,JSON.stringify(req.body).slice(0,2000)]);
  res.json({ ok: true });
}));

app.get('/api/admin/summary', authRequired, adminRequired, asyncRoute(async (req, res) => {
  const [[orders]] = await db.query("SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(CASE WHEN status NOT IN ('cancelado') THEN total ELSE 0 END),0) AS valor_pedidos FROM pedidos");
  const [[products]] = await db.query('SELECT COUNT(*) AS total_produtos, SUM(disponivel=TRUE) AS disponiveis FROM produtos');
  const [[today]] = await db.query("SELECT COUNT(*) AS pedidos_hoje, COALESCE(SUM(CASE WHEN status <> 'cancelado' THEN total ELSE 0 END),0) AS faturamento_hoje FROM pedidos WHERE DATE(criado_em)=CURDATE()");
  const [[pending]] = await db.query("SELECT COUNT(*) AS pedidos_pendentes FROM pedidos WHERE status IN ('aguardando_pagamento','confirmado','em_preparo','pronto')");
  const [top] = await db.query(`SELECT ip.nome_produto, SUM(ip.quantidade) AS quantidade
    FROM itens_pedido ip JOIN pedidos p ON p.id=ip.pedido_id WHERE p.status <> 'cancelado'
    GROUP BY ip.nome_produto ORDER BY quantidade DESC LIMIT 5`);
  res.json({ ...orders, ...products, ...today, ...pending, mais_vendidos: top });
}));


// Recursos V3: favoritos, comunicados e cupons (SQL em database/migrate-v3.sql).
app.get('/api/announcements', asyncRoute(async (req,res) => {
  const [rows] = await db.query('SELECT id,titulo,mensagem,tipo FROM comunicados WHERE ativo=1 ORDER BY criado_em DESC LIMIT 10');
  res.json(rows);
}));

app.get('/api/favorites', authRequired, asyncRoute(async (req,res) => {
  const [rows] = await db.query(`SELECT p.id,p.nome,p.descricao,p.preco,p.imagem_url,p.disponivel FROM favoritos f JOIN produtos p ON p.id=f.produto_id WHERE f.usuario_id=? ORDER BY f.criado_em DESC`,[req.user.id]);
  res.json(rows);
}));
app.post('/api/favorites/:id', authRequired, asyncRoute(async (req,res) => {
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<1) return res.status(400).json({error:'Produto inválido'});
  const [found]=await db.query('SELECT id FROM produtos WHERE id=?',[id]);
  if(!found.length) return res.status(404).json({error:'Produto não encontrado'});
  await db.query('INSERT IGNORE INTO favoritos (usuario_id,produto_id) VALUES (?,?)',[req.user.id,id]);
  res.status(201).json({ok:true});
}));
app.delete('/api/favorites/:id', authRequired, asyncRoute(async (req,res) => {
  await db.query('DELETE FROM favoritos WHERE usuario_id=? AND produto_id=?',[req.user.id,Number(req.params.id)||0]);
  res.json({ok:true});
}));
app.post('/api/coupons/validate', authRequired, asyncRoute(async (req,res) => {
  const codigo=String(req.body.codigo||'').trim().toUpperCase();
  if(!/^[A-Z0-9_-]{3,32}$/.test(codigo)) return res.status(400).json({error:'Cupom inválido'});
  const [rows]=await db.query('SELECT codigo,percentual,validade,limite_usos,usos FROM cupons WHERE codigo=? AND ativo=1 AND (validade IS NULL OR validade>=NOW())',[codigo]);
  const cupom=rows[0];
  if(!cupom || (cupom.limite_usos!==null && cupom.usos>=cupom.limite_usos)) return res.status(404).json({error:'Cupom indisponível'});
  res.json({valido:true,codigo:cupom.codigo,percentual:Number(cupom.percentual),observacao:'Consulta informativa. O desconto ainda não é aplicado no checkout.'});
}));
app.get('/api/admin/low-stock',authRequired,adminRequired,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT id,nome,estoque,disponivel FROM produtos WHERE estoque IS NOT NULL AND estoque<=5 ORDER BY estoque,nome LIMIT 100');
  res.json(rows);
}));
app.post('/api/admin/announcements',authRequired,adminRequired,asyncRoute(async(req,res)=>{
  const titulo=String(req.body.titulo||'').trim();
  const mensagem=String(req.body.mensagem||'').trim();
  if(titulo.length<3||titulo.length>100||mensagem.length<3||mensagem.length>500) return res.status(400).json({error:'Título ou mensagem inválidos'});
  const [r]=await db.query('INSERT INTO comunicados (titulo,mensagem,tipo) VALUES (?,?,?)',[titulo,mensagem,'info']);
  res.status(201).json({id:r.insertId});
}));


// V5: funcionalidades adicionais; todas as rotas privadas usam JWT.
app.get('/api/products/:id/reviews',asyncRoute(async(req,res)=>{
 const [rows]=await db.query('SELECT a.nota,a.comentario,a.criado_em,u.nome FROM avaliacoes a JOIN usuarios u ON u.id=a.usuario_id WHERE a.produto_id=? ORDER BY a.id DESC LIMIT 100',[req.params.id]);res.json(rows);
}));
app.put('/api/products/:id/reviews',authRequired,asyncRoute(async(req,res)=>{
 const nota=Number(req.body.nota), comentario=String(req.body.comentario||'').trim();
 if(!Number.isInteger(nota)||nota<1||nota>5||comentario.length>500)return res.status(400).json({error:'Avaliação inválida.'});
 const [p]=await db.query('SELECT id FROM produtos WHERE id=?',[req.params.id]);if(!p.length)return res.status(404).json({error:'Produto não encontrado.'});
 await db.query('INSERT INTO avaliacoes(usuario_id,produto_id,nota,comentario) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE nota=VALUES(nota),comentario=VALUES(comentario)',[req.user.id,req.params.id,nota,comentario]);res.json({ok:true});
}));
app.get('/api/loyalty',authRequired,asyncRoute(async(req,res)=>{
 const [[r]]=await db.query('SELECT COALESCE((SELECT saldo FROM pontos_fidelidade WHERE usuario_id=?),0) AS pontos,COALESCE((SELECT saldo FROM carteiras_demo WHERE usuario_id=?),0) AS carteira_demo',[req.user.id,req.user.id]);res.json(r);
}));
app.get('/api/support',authRequired,asyncRoute(async(req,res)=>{
 const [r]=await db.query('SELECT id,assunto,mensagem,status,criado_em FROM chamados_suporte WHERE usuario_id=? ORDER BY id DESC LIMIT 50',[req.user.id]);res.json(r);
}));
app.post('/api/support',authRequired,asyncRoute(async(req,res)=>{
 const assunto=String(req.body.assunto||'').trim(),mensagem=String(req.body.mensagem||'').trim();
 if(assunto.length<3||assunto.length>120||mensagem.length<5||mensagem.length>1500)return res.status(400).json({error:'Assunto ou mensagem inválidos.'});
 const [r]=await db.query('INSERT INTO chamados_suporte(usuario_id,assunto,mensagem) VALUES (?,?,?)',[req.user.id,assunto,mensagem]);res.status(201).json({id:r.insertId});
}));
app.get('/api/preferences',authRequired,asyncRoute(async(req,res)=>{
 const [[r]]=await db.query("SELECT COALESCE((SELECT tema FROM preferencia_usuario WHERE usuario_id=?),'sistema') AS tema",[req.user.id]);res.json(r);
}));
app.put('/api/preferences',authRequired,asyncRoute(async(req,res)=>{
 const tema=String(req.body.tema||'sistema');if(!['claro','escuro','sistema'].includes(tema))return res.status(400).json({error:'Tema inválido.'});
 await db.query('INSERT INTO preferencia_usuario(usuario_id,tema) VALUES (?,?) ON DUPLICATE KEY UPDATE tema=VALUES(tema)',[req.user.id,tema]);res.json({ok:true});
}));
app.get('/api/admin/slots',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const [r]=await db.query('SELECT * FROM horarios_retirada WHERE inicio>DATE_SUB(NOW(),INTERVAL 1 DAY) ORDER BY inicio LIMIT 1500');res.json(r);
}));
app.post('/api/admin/slots',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const inicio=String(req.body.inicio||''),fim=String(req.body.fim||''),capacidade=Number(req.body.capacidade);
 if(!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(inicio)||!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(fim)||inicio>=fim||!Number.isInteger(capacidade)||capacidade<1||capacidade>500)return res.status(400).json({error:'Data/hora ou capacidade inválida. Use AAAA-MM-DD HH:MM:SS.'});
 const [r]=await db.query('INSERT INTO horarios_retirada(inicio,fim,capacidade) VALUES (?,?,?)',[inicio,fim,capacidade]);res.status(201).json({id:r.insertId});
}));
// Gera uma agenda de retirada com intervalos de 15 minutos, das 07:45 ate 22:00.
// Operacao idempotente: nao duplica horarios existentes e nao apaga reservas.
app.post('/api/admin/slots/generate',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const day=String(req.body.data||'');
 const capacity=Number(req.body.capacidade||10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(capacity)||capacity<1||capacity>500)
   return res.status(400).json({error:'Informe data AAAA-MM-DD e capacidade entre 1 e 500.'});
 const d=new Date(`${day}T12:00:00Z`);
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==day)
   return res.status(400).json({error:'Data invalida.'});
 const [existing]=await db.query("SELECT DATE_FORMAT(inicio, '%Y-%m-%d %H:%i:%s') AS inicio FROM horarios_retirada WHERE inicio>=? AND inicio<DATE_ADD(?,INTERVAL 1 DAY)",[day,day]);
 const used=new Set(existing.map(x=>x.inicio));
 const rows=[];
 for(let min=7*60+45;min<22*60;min+=15){
   const format=m=>`${day} ${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00`;
   const start=format(min);
   if(!used.has(start))rows.push([start,format(min+15),capacity]);
 }
 if(rows.length) await db.query('INSERT INTO horarios_retirada(inicio,fim,capacidade,ativo) VALUES '+rows.map(()=>'(?,?,?,TRUE)').join(','),rows.flat());
 res.status(201).json({criados:rows.length,existentes:existing.length,data:day});
}));
app.patch('/api/admin/slots/:id',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 if(typeof req.body.ativo!=='boolean')return res.status(400).json({error:'Informe ativo como verdadeiro/falso.'});
 await db.query('UPDATE horarios_retirada SET ativo=? WHERE id=?',[req.body.ativo,req.params.id]);res.json({ok:true});
}));
app.get('/api/admin/support',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const [r]=await db.query('SELECT s.*,u.nome FROM chamados_suporte s JOIN usuarios u ON u.id=s.usuario_id ORDER BY s.id DESC LIMIT 100');res.json(r);
}));
app.patch('/api/admin/support/:id',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const status=String(req.body.status||'');if(!['aberto','respondido','fechado'].includes(status))return res.status(400).json({error:'Status inválido.'});
 await db.query('UPDATE chamados_suporte SET status=? WHERE id=?',[status,req.params.id]);res.json({ok:true});
}));
app.get('/api/admin/analytics',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const [daily]=await db.query("SELECT DATE(criado_em) AS dia,COUNT(*) AS pedidos,COALESCE(SUM(IF(status='cancelado',0,total)),0) AS valor_simulado FROM pedidos WHERE criado_em>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) GROUP BY DATE(criado_em) ORDER BY dia");
 const [stock]=await db.query('SELECT id,nome,estoque FROM produtos WHERE estoque IS NOT NULL AND estoque<=5 ORDER BY estoque LIMIT 30');res.json({diario:daily,estoque_baixo:stock});
}));
app.get('/api/admin/settings',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const [r]=await db.query('SELECT chave,valor FROM configuracoes_loja');res.json(Object.fromEntries(r.map(x=>[x.chave,x.valor])));
}));
app.put('/api/admin/settings',authRequired,adminRequired,asyncRoute(async(req,res)=>{
 const allowed=['nome_loja','aceitando_pedidos','tempo_preparo_minutos'];const updates=Object.entries(req.body).filter(([k])=>allowed.includes(k));
 if(!updates.length)return res.status(400).json({error:'Nenhuma configuração permitida.'});
 for(const [k,v] of updates){const value=String(v).slice(0,200);await db.query('INSERT INTO configuracoes_loja(chave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',[k,value]);}res.json({ok:true});
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Erro interno da API. Confira o terminal do backend.' });
});

const port = Number(process.env.PORT || 3333);
app.listen(port, '0.0.0.0', () => console.log(`SENAI Express API em http://localhost:${port}`));
