const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Faça login para continuar.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.funcao !== 'admin') {
    return res.status(403).json({ error: 'Acesso permitido somente para administradores.' });
  }
  next();
}

module.exports = { authRequired, adminRequired };
