import { Router } from 'express';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(authMiddleware);

usersRouter.get('/profile', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, full_name, phone, is_tenant, is_agent, is_landlord, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profile = { ...user, is_tenant: !!user.is_tenant, is_agent: !!user.is_agent, is_landlord: !!user.is_landlord };
  const tenantProfile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  if (tenantProfile) profile.tenant_profile = tenantProfile;
  res.json(profile);
});
