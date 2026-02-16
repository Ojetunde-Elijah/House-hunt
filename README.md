# House Hunt — Rental Lifecycle Manager

Full-stack app: **Express (Node.js)** backend + **React (Vite)** frontend.

## Features

- **Location**: Map pin (GIS), "Use my location", directions from a landmark
- **Listings**: Full cost breakdown (agency, legal, caution, service charge, total), inspection fee (optional/negotiable), rent history
- **Amenities**: Bedrooms/toilets/kitchen size, prepaid meter, band of light, borehole, neighbors, landlord on-site
- **Verification tiers**: Unverified, Verified, Premium verified
- **One account, multiple roles**: Tenant / Agent / Landlord toggles
- **Rental lifecycle**: "House secured", searching toggle, lease end date, saved searches, rent history, move-in/out checklist, lease reminder
- **Reviews**: Location accurate, amenities as described, no hidden fees
- **Disputes**: Report misleading listing
- **Co-agents**: Multiple agents per listing

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set JWT_SECRET
npm install
npm run db:init
npm run dev
```

Runs at **http://localhost:5000**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:3000** and proxies `/api` to the backend.

## API overview

| Path | Description |
|------|-------------|
| `POST /api/auth/register` | Register (optional isAgent, isLandlord) |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Current user |
| `PATCH /api/auth/me/roles` | Update isAgent / isLandlord |
| `GET/POST /api/properties` | List / create property (address, lat/lng, landmark, directions) |
| `GET /api/listings` | List (filters: status, verification, minRent, maxRent, bedrooms, lat/lng/radiusKm) |
| `GET/POST /api/listings/:id` | Get / create listing (full cost + amenities) |
| `POST /api/listings/:id/upload` | Upload media (multipart) |
| `GET/POST /api/reviews` | Reviews (listingId), tenant ratings |
| `GET/POST /api/disputes` | Report / list disputes |
| `GET/PUT /api/lifecycle/profile` | Tenant profile (isSearching, leaseEndDate, budget, etc.) |
| `GET/POST /api/lifecycle/saved-searches` | Saved searches |
| `GET/POST /api/lifecycle/rent-history` | Rent history |
| `GET /api/lifecycle/lease-reminders` | Lease ending soon |
| `GET/POST /api/lifecycle/checklists` | Move-in/out checklists |

## Database

SQLite at `backend/data/househunt.db`. Tables: `users`, `properties`, `listings`, `reviews`, `disputes`, `penalties`, `tenant_profiles`, `saved_searches`, `rent_history`, `move_checklists`, `listing_agents`.

## Security notes

- JWT in `Authorization: Bearer <token>`
- Penalties: warning → suspension → ban; suspended/banned agents cannot create listings
- Resolving a dispute suspends the listing and adds a warning to the agent
