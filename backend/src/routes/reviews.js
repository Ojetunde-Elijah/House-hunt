import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export const reviewsRouter = Router();

reviewsRouter.get('/', (req, res) => {
  const listingId = req.query.listingId;
  const db = getDb();
  if (listingId) {
    const list = db.prepare(`
      SELECT r.*, u.full_name AS tenant_name
      FROM reviews r JOIN users u ON r.tenant_id = u.id
      WHERE r.listing_id = ? ORDER BY r.created_at DESC
    `).all(listingId);
    return res.json(list);
  }
  res.status(400).json({ error: 'listingId required' });
});

reviewsRouter.post(
  '/',
  authMiddleware,
  requireRole('tenant'),
  [
    body('listingId').isInt(),
    body('locationAccurate').optional().isInt({ min: 1, max: 5 }),
    body('amenitiesAsDescribed').optional().isInt({ min: 1, max: 5 }),
    body('noHiddenFees').optional().isInt({ min: 1, max: 5 }),
    body('overallRating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM reviews WHERE listing_id = ? AND tenant_id = ?').get(req.body.listingId, req.user.id);
    if (existing) return res.status(400).json({ error: 'You already reviewed this listing' });
    db.prepare(`
      INSERT INTO reviews (listing_id, tenant_id, location_accurate, amenities_as_described, no_hidden_fees, overall_rating, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.body.listingId, req.user.id,
      req.body.locationAccurate ?? null, req.body.amenitiesAsDescribed ?? null, req.body.noHiddenFees ?? null,
      req.body.overallRating, req.body.comment || null
    );
    const review = db.prepare('SELECT * FROM reviews WHERE listing_id = ? AND tenant_id = ?').get(req.body.listingId, req.user.id);
    res.status(201).json(review);
  }
);
