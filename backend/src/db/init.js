import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'househunt.db');

export function getDb() {
  return new Database(dbPath);
}

export function ensureDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = getDb();

  db.exec(`
    -- Users: one account, multiple roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_tenant INTEGER DEFAULT 1,
      is_agent INTEGER DEFAULT 0,
      is_landlord INTEGER DEFAULT 0
    );

    -- Physical property (can be re-listed without re-entering)
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      landmark_name TEXT,
      directions_from_landmark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by_user_id INTEGER REFERENCES users(id)
    );

    -- Listings: agent lists a property with costs and amenities
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      agent_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      verification_tier TEXT DEFAULT 'unverified' CHECK(verification_tier IN ('unverified','verified','premium_verified')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','removed')),
      inspection_fee_amount REAL,
      inspection_fee_negotiable INTEGER DEFAULT 0,
      landlord_waives_inspection_fee INTEGER DEFAULT 0,
      agency_fee REAL,
      legal_fee REAL,
      caution_deposit REAL,
      service_charge REAL,
      monthly_rent REAL NOT NULL,
      rent_history_notes TEXT,
      bedrooms_count INTEGER,
      bedrooms_size_sqm REAL,
      toilets_count INTEGER,
      toilets_size_sqm REAL,
      kitchen_size_sqm REAL,
      prepaid_meter INTEGER,
      band_of_light TEXT,
      borehole_or_well INTEGER,
      neighbors_count INTEGER,
      landlord_lives_in_house INTEGER,
      media_urls TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Reviews: tenant rates listing accuracy
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      tenant_id INTEGER NOT NULL REFERENCES users(id),
      location_accurate INTEGER,
      amenities_as_described INTEGER,
      no_hidden_fees INTEGER,
      overall_rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Disputes / report misleading listing
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      reported_by_user_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','dismissed')),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolution_notes TEXT
    );

    -- Penalties for agents
    CREATE TABLE IF NOT EXISTS penalties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('warning','suspension','ban')),
      listing_id INTEGER REFERENCES listings(id),
      reason TEXT,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Tenant lifecycle
    CREATE TABLE IF NOT EXISTS tenant_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
      is_searching INTEGER DEFAULT 1,
      secured_listing_id INTEGER REFERENCES listings(id),
      lease_end_date TEXT,
      preferred_areas TEXT,
      min_budget REAL,
      max_budget REAL,
      bedrooms_wanted INTEGER,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT,
      filters_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rent_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      listing_id INTEGER REFERENCES listings(id),
      amount REAL NOT NULL,
      period_start TEXT,
      period_end TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS move_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      listing_id INTEGER REFERENCES listings(id),
      type TEXT NOT NULL CHECK(type IN ('move_in','move_out')),
      items_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS listing_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      agent_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'primary',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(listing_id, agent_id)
    );
  `);

  db.close();
  return dbPath;
}
