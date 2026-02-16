import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().notEmpty(),
    body('phone').optional().trim(),
    body('isAgent').optional().isBoolean(),
    body('isLandlord').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password, fullName, phone, isAgent, isLandlord } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      `INSERT INTO users (email, password_hash, full_name, phone, is_tenant, is_agent, is_landlord)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    ).run(email, password_hash, fullName, phone || null, isAgent ? 1 : 0, isLandlord ? 1 : 0);
    const user = db.prepare('SELECT id, email, full_name, phone, is_tenant, is_agent, is_landlord, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    const token = signToken({ id: user.id, email: user.email, is_tenant: user.is_tenant, is_agent: user.is_agent, is_landlord: user.is_landlord });
    res.status(201).json({ user: { ...user, is_tenant: !!user.is_tenant, is_agent: !!user.is_agent, is_landlord: !!user.is_landlord }, token });
  }
);

authRouter.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT id, email, password_hash, full_name, phone, is_tenant, is_agent, is_landlord, created_at FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    delete user.password_hash;
    const token = signToken({ id: user.id, email: user.email, is_tenant: user.is_tenant, is_agent: user.is_agent, is_landlord: user.is_landlord });
    res.json({ user: { ...user, is_tenant: !!user.is_tenant, is_agent: !!user.is_agent, is_landlord: !!user.is_landlord }, token });
  }
);

authRouter.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, full_name, phone, is_tenant, is_agent, is_landlord, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, is_tenant: !!user.is_tenant, is_agent: !!user.is_agent, is_landlord: !!user.is_landlord });
});

authRouter.patch('/me/roles', authMiddleware, [
  body('isAgent').optional().isBoolean(),
  body('isLandlord').optional().isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const updates = [];
  const params = [];
  if (req.body.isAgent !== undefined) { updates.push('is_agent = ?'); params.push(req.body.isAgent ? 1 : 0); }
  if (req.body.isLandlord !== undefined) { updates.push('is_landlord = ?'); params.push(req.body.isLandlord ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'No role updates provided' });
  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT id, email, full_name, phone, is_tenant, is_agent, is_landlord FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...user, is_tenant: !!user.is_tenant, is_agent: !!user.is_agent, is_landlord: !!user.is_landlord });
});
