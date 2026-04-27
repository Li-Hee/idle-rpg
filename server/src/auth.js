// ============================================================
// Authentication — user accounts, JWT, middleware
// ============================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { save, load } from './storage.js';

const JWT_SECRET = process.env.JWT_SECRET || (() => { console.error('FATAL: JWT_SECRET 环境变量未设置！'); process.exit(1); })();
const SALT_ROUNDS = 10;

// ---- User storage helpers ----

function getUsers() {
  return load('users', {});
}

export function getUserCount() {
  return Object.keys(getUsers()).length;
}

function saveUsers(users) {
  save('users', users);
}

// ---- Routes ----

export function registerRoute(req, res) {
  const { username, password } = req.body;
  if (!username || !password || username.length < 2 || password.length < 4) {
    return res.status(400).json({ error: '用户名至少2个字符，密码至少4个字符' });
  }
  if (!/^[a-zA-Z0-9_一-鿿]+$/.test(username)) {
    return res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
  }
  const users = getUsers();
  if (users[username]) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  users[username] = { username, passwordHash: hash, createdAt: Date.now() };
  saveUsers(users);
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
}

export function loginRoute(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const users = getUsers();
  const user = users[username];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
}

// ---- JWT Middleware ----

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}
