import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/init.js';
import { authMiddleware } from '../middleware/auth.js';

export const propertiesRouter = Router();

propertiesRouter.get('/', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM properties ORDER BY updated_at DESC').all();
  res.json(list);
});

propertiesRouter.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Property not found' });
  res.json(row);
});

propertiesRouter.post(
  '/',
  authMiddleware,
  [
    body('address').trim().notEmpty(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('landmarkName').optional().trim(),
    body('directionsFromLandmark').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { address, latitude, longitude, landmarkName, directionsFromLandmark } = req.body;
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO properties (address, latitude, longitude, landmark_name, directions_from_landmark, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(address, latitude ?? null, longitude ?? null, landmarkName || null, directionsFromLandmark || null, req.user.id);
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(property);
  }
);

propertiesRouter.patch(
  '/:id',
  authMiddleware,
  [
    body('address').optional().trim().notEmpty(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('landmarkName').optional().trim(),
    body('directionsFromLandmark').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Property not found' });
    const updates = [];
    const params = [];
    const { address, latitude, longitude, landmarkName, directionsFromLandmark } = req.body;
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (latitude !== undefined) { updates.push('latitude = ?'); params.push(latitude); }
    if (longitude !== undefined) { updates.push('longitude = ?'); params.push(longitude); }
    if (landmarkName !== undefined) { updates.push('landmark_name = ?'); params.push(landmarkName); }
    if (directionsFromLandmark !== undefined) { updates.push('directions_from_landmark = ?'); params.push(directionsFromLandmark); }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates' });
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    res.json(property);
  }
);
