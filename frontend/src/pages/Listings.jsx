import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapView } from '../components/Map';
import { mockListings } from '../mock/listings';
import './Listings.css';

export default function Listings() {
  const [filters, setFilters] = useState({ maxRent: '', bedrooms: '', verification: '' });
  const [userLocation, setUserLocation] = useState(null);

  const filtered = useMemo(() => {
    return mockListings.filter((l) => {
      if (filters.maxRent && Number(l.monthly_rent) > Number(filters.maxRent)) return false;
      if (filters.bedrooms && Number(l.bedrooms_count || 0) < Number(filters.bedrooms)) return false;
      if (filters.verification && l.verification_tier !== filters.verification) return false;
      return true;
    });
  }, [filters.maxRent, filters.bedrooms, filters.verification]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  };

  const markers = filtered
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => [l.latitude, l.longitude]);
  const mapCenter =
    userLocation || (filtered[0] && filtered[0].latitude != null ? [filtered[0].latitude, filtered[0].longitude] : null);

  return (
    <div className="listings-page fade-in">
      <div className="listings-header">
        <h1>Featured rentals</h1>
        <p className="subtitle">Beautiful, AI-illustrated homes with full cost breakdown and honest amenities.</p>
      </div>
      <div className="listings-toolbar glassy">
        <div className="filters">
          <input
            type="number"
            placeholder="Max rent (₦)"
            value={filters.maxRent}
            onChange={(e) => setFilters((f) => ({ ...f, maxRent: e.target.value }))}
          />
          <select
            value={filters.bedrooms}
            onChange={(e) => setFilters((f) => ({ ...f, bedrooms: e.target.value }))}
          >
            <option value="">Any bedrooms</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
          <select
            value={filters.verification}
            onChange={(e) => setFilters((f) => ({ ...f, verification: e.target.value }))}
          >
            <option value="">Any verification</option>
            <option value="verified">Verified</option>
            <option value="premium_verified">Premium verified</option>
          </select>
        </div>
        <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
          Use my location
        </button>
      </div>
      {mapCenter && (
        <div className="listings-map-wrap">
          <MapView center={mapCenter} markers={markers} height={220} />
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="muted">No listings match your filters yet.</p>
      ) : (
        <ul className="listings-grid">
          {filtered.map((l, index) => (
            <li
              key={l.id}
              className="listing-card card slide-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Link to={`/listings/${l.id}`}>
                {Array.isArray(l.media_urls) && l.media_urls[0] && (
                  <div className="listing-thumb-wrap">
                    <img src={l.media_urls[0]} alt={l.title} className="listing-thumb" loading="lazy" />
                    <div className="listing-thumb-gradient" />
                    <span className={`badge badge-${(l.verification_tier || 'unverified').replace('-', '_')}`}>
                      {l.verification_tier || 'Unverified'}
                    </span>
                  </div>
                )}
                <div className="listing-body">
                  <h3>{l.title}</h3>
                  <p className="address">{l.address}</p>
                  <p className="rent">₦{Number(l.monthly_rent).toLocaleString()}/mo</p>
                  <div className="meta-row">
                    {l.bedrooms_count != null && <span>{l.bedrooms_count} bed</span>}
                    {l.band_of_light && <span>{l.band_of_light}</span>}
                    {l.prepaid_meter ? <span>Prepaid meter</span> : <span>No prepaid</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
