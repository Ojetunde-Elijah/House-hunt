import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export const lifecycleRouter = Router();
lifecycleRouter.use(authMiddleware);

lifecycleRouter.get('/profile', requireRole('tenant'), (req, res) => {
  const db = getDb();
  let profile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) {
    db.prepare('INSERT INTO tenant_profiles (user_id, is_searching) VALUES (?, 1)').run(req.user.id);
    profile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  }
  res.json(profile);
});

lifecycleRouter.put('/profile', requireRole('tenant'), [
  body('isSearching').optional().isBoolean(),
  body('securedListingId').optional().isInt(),
  body('leaseEndDate').optional().trim(),
  body('preferredAreas').optional().trim(),
  body('minBudget').optional().isFloat({ min: 0 }),
  body('maxBudget').optional().isFloat({ min: 0 }),
  body('bedroomsWanted').optional().isInt({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  let profile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) {
    db.prepare('INSERT INTO tenant_profiles (user_id) VALUES (?)').run(req.user.id);
    profile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  }
  const p = req.body;
  const updates = [];
  const params = [];
  if (p.isSearching !== undefined) { updates.push('is_searching = ?'); params.push(p.isSearching ? 1 : 0); }
  if (p.securedListingId !== undefined) { updates.push('secured_listing_id = ?'); params.push(p.securedListingId); }
  if (p.leaseEndDate !== undefined) { updates.push('lease_end_date = ?'); params.push(p.leaseEndDate || null); }
  if (p.preferredAreas !== undefined) { updates.push('preferred_areas = ?'); params.push(p.preferredAreas || null); }
  if (p.minBudget !== undefined) { updates.push('min_budget = ?'); params.push(p.minBudget); }
  if (p.maxBudget !== undefined) { updates.push('max_budget = ?'); params.push(p.maxBudget); }
  if (p.bedroomsWanted !== undefined) { updates.push('bedrooms_wanted = ?'); params.push(p.bedroomsWanted); }
  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);
    db.prepare(`UPDATE tenant_profiles SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
  }
  profile = db.prepare('SELECT * FROM tenant_profiles WHERE user_id = ?').get(req.user.id);
  res.json(profile);
});

lifecycleRouter.get('/saved-searches', requireRole('tenant'), (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(list.map(s => ({ ...s, filters: s.filters_json ? JSON.parse(s.filters_json) : null })));
});

lifecycleRouter.post('/saved-searches', requireRole('tenant'), [
  body('name').optional().trim(),
  body('filters').optional().isObject(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const result = db.prepare('INSERT INTO saved_searches (user_id, name, filters_json) VALUES (?, ?, ?)').run(
    req.user.id, req.body.name || 'Saved search', JSON.stringify(req.body.filters || {})
  );
  const row = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, filters: row.filters_json ? JSON.parse(row.filters_json) : null });
});

lifecycleRouter.get('/rent-history', requireRole('tenant'), (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM rent_history WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(list);
});

lifecycleRouter.post('/rent-history', requireRole('tenant'), [
  body('amount').isFloat({ min: 0 }),
  body('periodStart').optional().trim(),
  body('periodEnd').optional().trim(),
  body('listingId').optional().isInt(),
  body('note').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO rent_history (user_id, listing_id, amount, period_start, period_end, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, req.body.listingId || null, req.body.amount, req.body.periodStart || null, req.body.periodEnd || null, req.body.note || null);
  const row = db.prepare('SELECT * FROM rent_history WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

lifecycleRouter.get('/lease-reminders', requireRole('tenant'), (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT lease_end_date, secured_listing_id FROM tenant_profiles WHERE user_id = ? AND is_searching = 0').get(req.user.id);
  if (!profile || !profile.lease_end_date) return res.json({ reminder: null });
  const end = new Date(profile.lease_end_date);
  const in3Months = new Date(); in3Months.setMonth(in3Months.getMonth() + 3);
  const reminder = end <= in3Months ? { message: 'Your lease is probably ending soon. Start looking?', leaseEndDate: profile.lease_end_date } : null;
  res.json({ reminder });
});

lifecycleRouter.get('/checklists', requireRole('tenant'), (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM move_checklists WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(list.map(c => ({ ...c, items: c.items_json ? JSON.parse(c.items_json) : [] })));
});

lifecycleRouter.post('/checklists', requireRole('tenant'), [
  body('type').isIn(['move_in', 'move_out']),
  body('listingId').optional().isInt(),
  body('items').optional().isArray(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO move_checklists (user_id, listing_id, type, items_json) VALUES (?, ?, ?, ?)
  `).run(req.user.id, req.body.listingId || null, req.body.type, JSON.stringify(req.body.items || []));
  const row = db.prepare('SELECT * FROM move_checklists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, items: row.items_json ? JSON.parse(row.items_json) : [] });
});
