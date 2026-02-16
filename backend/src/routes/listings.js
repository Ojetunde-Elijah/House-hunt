import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { upload } from '../upload.js';

export const listingsRouter = Router();

function checkPenalty(db, userId) {
  const ban = db.prepare(
    `SELECT id FROM penalties WHERE user_id = ? AND type = 'ban' AND (ends_at IS NULL OR ends_at > datetime('now'))`
  ).get(userId);
  if (ban) return { allowed: false, reason: 'banned' };
  const suspension = db.prepare(
    `SELECT id, ends_at FROM penalties WHERE user_id = ? AND type = 'suspension' AND ends_at > datetime('now')`
  ).get(userId);
  if (suspension) return { allowed: false, reason: 'suspended', ends_at: suspension.ends_at };
  return { allowed: true };
}

listingsRouter.get('/', [
  query('status').optional().isIn(['active', 'suspended', 'removed']),
  query('verification').optional().isIn(['unverified', 'verified', 'premium_verified']),
  query('minRent').optional().isFloat({ min: 0 }),
  query('maxRent').optional().isFloat({ min: 0 }),
  query('bedrooms').optional().isInt({ min: 0 }),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radiusKm').optional().isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  let sql = `
    SELECT l.*, p.address, p.latitude, p.longitude, p.landmark_name, p.directions_from_landmark,
           u.full_name AS agent_name, u.phone AS agent_phone
    FROM listings l
    JOIN properties p ON l.property_id = p.id
    JOIN users u ON l.agent_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.status) { sql += ' AND l.status = ?'; params.push(req.query.status); }
  else sql += " AND l.status = 'active'";
  if (req.query.verification) { sql += ' AND l.verification_tier = ?'; params.push(req.query.verification); }
  if (req.query.minRent) { sql += ' AND l.monthly_rent >= ?'; params.push(req.query.minRent); }
  if (req.query.maxRent) { sql += ' AND l.monthly_rent <= ?'; params.push(req.query.maxRent); }
  if (req.query.bedrooms != null) { sql += ' AND l.bedrooms_count >= ?'; params.push(req.query.bedrooms); }
  sql += ' ORDER BY l.updated_at DESC';
  let list = db.prepare(sql).all(...params);
  if (req.query.lat != null && req.query.lng != null && req.query.radiusKm != null) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const r = parseFloat(req.query.radiusKm);
    const approx = 111; // km per degree
    list = list.filter(l => {
      if (l.latitude == null || l.longitude == null) return false;
      const d = Math.sqrt(Math.pow((l.latitude - lat) * approx, 2) + Math.pow((l.longitude - lng) * approx, 2));
      return d <= r;
    });
  }
  res.json(list);
});

listingsRouter.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT l.*, p.address, p.latitude, p.longitude, p.landmark_name, p.directions_from_landmark,
           u.full_name AS agent_name, u.phone AS agent_phone
    FROM listings l
    JOIN properties p ON l.property_id = p.id
    JOIN users u ON l.agent_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  const coAgents = db.prepare('SELECT la.agent_id, u.full_name FROM listing_agents la JOIN users u ON la.agent_id = u.id WHERE la.listing_id = ?').all(row.id);
  res.json({ ...row, co_agents: coAgents });
});

const listingBodyValidators = [
  body('propertyId').isInt(),
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('verificationTier').optional().isIn(['unverified', 'verified', 'premium_verified']),
  body('inspectionFeeAmount').optional().isFloat({ min: 0 }),
  body('inspectionFeeNegotiable').optional().isBoolean(),
  body('landlordWaivesInspectionFee').optional().isBoolean(),
  body('agencyFee').optional().isFloat({ min: 0 }),
  body('legalFee').optional().isFloat({ min: 0 }),
  body('cautionDeposit').optional().isFloat({ min: 0 }),
  body('serviceCharge').optional().isFloat({ min: 0 }),
  body('monthlyRent').isFloat({ min: 0 }),
  body('rentHistoryNotes').optional().trim(),
  body('bedroomsCount').optional().isInt({ min: 0 }),
  body('bedroomsSizeSqm').optional().isFloat({ min: 0 }),
  body('toiletsCount').optional().isInt({ min: 0 }),
  body('toiletsSizeSqm').optional().isFloat({ min: 0 }),
  body('kitchenSizeSqm').optional().isFloat({ min: 0 }),
  body('prepaidMeter').optional().isBoolean(),
  body('bandOfLight').optional().trim(),
  body('boreholeOrWell').optional().isBoolean(),
  body('neighborsCount').optional().isInt({ min: 0 }),
  body('landlordLivesInHouse').optional().isBoolean(),
  body('coAgentIds').optional().isArray(),
];

listingsRouter.post(
  '/',
  authMiddleware,
  requireRole('agent'),
  listingBodyValidators,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const penalty = checkPenalty(db, req.user.id);
    if (!penalty.allowed) return res.status(403).json({ error: penalty.reason, ends_at: penalty.ends_at });
    const p = req.body;
    const totalPackage = (p.monthlyRent || 0) + (p.agencyFee || 0) + (p.legalFee || 0) + (p.cautionDeposit || 0) + (p.serviceCharge || 0);
    const result = db.prepare(`
      INSERT INTO listings (
        property_id, agent_id, title, description, verification_tier,
        inspection_fee_amount, inspection_fee_negotiable, landlord_waives_inspection_fee,
        agency_fee, legal_fee, caution_deposit, service_charge, monthly_rent, rent_history_notes,
        bedrooms_count, bedrooms_size_sqm, toilets_count, toilets_size_sqm, kitchen_size_sqm,
        prepaid_meter, band_of_light, borehole_or_well, neighbors_count, landlord_lives_in_house, media_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.propertyId, req.user.id, p.title, p.description || null, p.verificationTier || 'unverified',
      p.inspectionFeeAmount ?? null, p.inspectionFeeNegotiable ? 1 : 0, p.landlordWaivesInspectionFee ? 1 : 0,
      p.agencyFee ?? null, p.legalFee ?? null, p.cautionDeposit ?? null, p.serviceCharge ?? null, p.monthlyRent, p.rentHistoryNotes || null,
      p.bedroomsCount ?? null, p.bedroomsSizeSqm ?? null, p.toiletsCount ?? null, p.toiletsSizeSqm ?? null, p.kitchenSizeSqm ?? null,
      p.prepaidMeter != null ? (p.prepaidMeter ? 1 : 0) : null, p.bandOfLight || null, p.boreholeOrWell != null ? (p.boreholeOrWell ? 1 : 0) : null,
      p.neighborsCount ?? null, p.landlordLivesInHouse != null ? (p.landlordLivesInHouse ? 1 : 0) : null,
      Array.isArray(p.mediaUrls) ? JSON.stringify(p.mediaUrls) : null
    );
    const listingId = result.lastInsertRowid;
    if (Array.isArray(p.coAgentIds) && p.coAgentIds.length) {
      const ins = db.prepare('INSERT OR IGNORE INTO listing_agents (listing_id, agent_id, role) VALUES (?, ?, ?)');
      for (const aid of p.coAgentIds) ins.run(listingId, aid, 'co_agent');
    }
    const listing = db.prepare(`
      SELECT l.*, p.address, p.latitude, p.longitude, p.landmark_name, p.directions_from_landmark
      FROM listings l JOIN properties p ON l.property_id = p.id WHERE l.id = ?
    `).get(listingId);
    listing.total_package = totalPackage;
    res.status(201).json(listing);
  }
);

listingsRouter.patch(
  '/:id',
  authMiddleware,
  requireRole('agent'),
  listingBodyValidators.map(v => v.optional()),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const existing = db.prepare('SELECT id, agent_id FROM listings WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.agent_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    const penalty = checkPenalty(db, req.user.id);
    if (!penalty.allowed) return res.status(403).json({ error: penalty.reason });
    const p = req.body;
    const updates = [];
    const params = [];
    const map = {
      propertyId: 'property_id', title: 'title', description: 'description', verificationTier: 'verification_tier',
      inspectionFeeAmount: 'inspection_fee_amount', inspectionFeeNegotiable: 'inspection_fee_negotiable', landlordWaivesInspectionFee: 'landlord_waives_inspection_fee',
      agencyFee: 'agency_fee', legalFee: 'legal_fee', cautionDeposit: 'caution_deposit', serviceCharge: 'service_charge',
      monthlyRent: 'monthly_rent', rentHistoryNotes: 'rent_history_notes', bedroomsCount: 'bedrooms_count', bedroomsSizeSqm: 'bedrooms_size_sqm',
      toiletsCount: 'toilets_count', toiletsSizeSqm: 'toilets_size_sqm', kitchenSizeSqm: 'kitchen_size_sqm',
      prepaidMeter: 'prepaid_meter', bandOfLight: 'band_of_light', boreholeOrWell: 'borehole_or_well',
      neighborsCount: 'neighbors_count', landlordLivesInHouse: 'landlord_lives_in_house', mediaUrls: 'media_urls',
    };
    for (const [key, col] of Object.entries(map)) {
      if (p[key] === undefined) continue;
      if (key === 'inspectionFeeNegotiable' || key === 'landlordWaivesInspectionFee' || key === 'prepaidMeter' || key === 'boreholeOrWell' || key === 'landlordLivesInHouse') {
        updates.push(`${col} = ?`); params.push(p[key] ? 1 : 0);
      } else if (key === 'mediaUrls') {
        updates.push(`${col} = ?`); params.push(Array.isArray(p.mediaUrls) ? JSON.stringify(p.mediaUrls) : null);
      } else {
        updates.push(`${col} = ?`); params.push(p[key]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates' });
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const listing = db.prepare(`
      SELECT l.*, p.address, p.latitude, p.longitude, p.landmark_name, p.directions_from_landmark
      FROM listings l JOIN properties p ON l.property_id = p.id WHERE l.id = ?
    `).get(req.params.id);
    res.json(listing);
  }
);

listingsRouter.post('/:id/upload', authMiddleware, requireRole('agent'), upload.array('media', 10), (req, res) => {
  const db = getDb();
  const listing = db.prepare('SELECT id, agent_id, media_urls FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.agent_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = (listing.media_urls ? JSON.parse(listing.media_urls) : []).concat(
    (req.files || []).map(f => `${base}/uploads/${f.filename}`)
  );
  db.prepare("UPDATE listings SET media_urls = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(urls), req.params.id);
  res.json({ mediaUrls: urls });
});
