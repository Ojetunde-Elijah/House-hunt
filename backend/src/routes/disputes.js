import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

export const disputesRouter = Router();

disputesRouter.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const list = db.prepare(`
    SELECT d.*, l.title AS listing_title, u.full_name AS reported_by_name
    FROM disputes d
    JOIN listings l ON d.listing_id = l.id
    JOIN users u ON d.reported_by_user_id = u.id
    WHERE d.reported_by_user_id = ? OR l.agent_id = ?
    ORDER BY d.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(list);
});

disputesRouter.post(
  '/',
  authMiddleware,
  [body('listingId').isInt(), body('reason').trim().notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const listing = db.prepare('SELECT id, status FROM listings WHERE id = ?').get(req.body.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const result = db.prepare(`
      INSERT INTO disputes (listing_id, reported_by_user_id, reason, status)
      VALUES (?, ?, ?, 'open')
    `).run(req.body.listingId, req.user.id, req.body.reason);
    const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(dispute);
  }
);

disputesRouter.patch('/:id/resolve', authMiddleware, [
  body('status').isIn(['resolved', 'dismissed']),
  body('resolutionNotes').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const d = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Dispute not found' });
  db.prepare(`
    UPDATE disputes SET status = ?, resolved_at = datetime('now'), resolution_notes = ? WHERE id = ?
  `).run(req.body.status, req.body.resolutionNotes || null, req.params.id);
  const updated = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
  if (req.body.status === 'resolved') {
    db.prepare("UPDATE listings SET status = 'suspended' WHERE id = ?").run(d.listing_id);
    const listing = db.prepare('SELECT agent_id FROM listings WHERE id = ?').get(d.listing_id);
    if (listing) {
      db.prepare('INSERT INTO penalties (user_id, type, listing_id, reason) VALUES (?, ?, ?, ?)')
        .run(listing.agent_id, 'warning', d.listing_id, 'Resolved dispute - misleading listing');
    }
  }
  res.json(updated);
});
