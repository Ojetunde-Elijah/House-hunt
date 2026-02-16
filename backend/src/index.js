import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { propertiesRouter } from './routes/properties.js';
import { listingsRouter } from './routes/listings.js';
import { reviewsRouter } from './routes/reviews.js';
import { disputesRouter } from './routes/disputes.js';
import { lifecycleRouter } from './routes/lifecycle.js';
import { ensureDb } from './db/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

ensureDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/lifecycle', lifecycleRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`House Hunt API running on http://localhost:${PORT}`));
