import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/Map';
import { getMockListingById } from '../mock/listings';
import './ListingDetail.css';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    overallRating: 5,
    locationAccurate: 5,
    amenitiesAsDescribed: 5,
    noHiddenFees: 5,
    comment: '',
  });

  useEffect(() => {
    const found = getMockListingById(id);
    setListing(found || null);
  }, [id]);

  // In mock mode we keep reviews local-only so the page works without backend
  const handleReport = (e) => {
    e.preventDefault();
    // In a real environment this would call /api/disputes; here we just close the form
    setReportOpen(false);
    setReportReason('');
  };

  const handleReview = (e) => {
    e.preventDefault();
    const next = {
      id: Date.now(),
      tenant_name: user?.full_name || 'You',
      overall_rating: reviewForm.overallRating,
      comment: reviewForm.comment,
    };
    setReviews((prev) => [next, ...prev]);
    setReviewOpen(false);
  };

  if (!listing) return <div className="card">Listing not found.</div>;

  const mapCenter = listing.latitude != null && listing.longitude != null ? [listing.latitude, listing.longitude] : null;
  const mediaUrls = Array.isArray(listing.media_urls)
    ? listing.media_urls
    : listing.media_urls
    ? [listing.media_urls]
    : [];

  const totalPackage = (Number(listing.monthly_rent) || 0) + (Number(listing.agency_fee) || 0) + (Number(listing.legal_fee) || 0) + (Number(listing.caution_deposit) || 0) + (Number(listing.service_charge) || 0);

  return (
    <div className="listing-detail">
      <div className="detail-header">
        <span className={`badge badge-${(listing.verification_tier || 'unverified').replace('-', '_')}`}>
          {listing.verification_tier || 'Unverified'}
        </span>
        <h1>{listing.title}</h1>
        <p className="address">{listing.address}</p>
        <p className="rent">₦{Number(listing.monthly_rent).toLocaleString()}/month</p>
      </div>

      {mediaUrls.length > 0 && (
        <div className="media-strip">
          {mediaUrls.slice(0, 5).map((url, i) => (
            <img key={i} src={url} alt="" />
          ))}
        </div>
      )}

      {mapCenter && (
        <div className="map-section">
          <h3>Location</h3>
          <MapView center={mapCenter} markers={[mapCenter]} height={280} />
          {listing.directions_from_landmark && (
            <div className="directions card">
              <strong>From {listing.landmark_name || 'landmark'}:</strong>
              <p>{listing.directions_from_landmark}</p>
            </div>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            Get directions (Google Maps)
          </a>
        </div>
      )}

      <div className="card costs">
        <h3>Cost breakdown</h3>
        <ul>
          <li>Monthly rent: ₦{Number(listing.monthly_rent).toLocaleString()}</li>
          {listing.agency_fee != null && <li>Agency fee: ₦{Number(listing.agency_fee).toLocaleString()}</li>}
          {listing.legal_fee != null && <li>Legal fee: ₦{Number(listing.legal_fee).toLocaleString()}</li>}
          {listing.caution_deposit != null && <li>Caution deposit: ₦{Number(listing.caution_deposit).toLocaleString()}</li>}
          {listing.service_charge != null && <li>Service charge: ₦{Number(listing.service_charge).toLocaleString()}</li>}
          <li><strong>Total package: ₦{totalPackage.toLocaleString()}</strong></li>
        </ul>
        {listing.inspection_fee_amount != null && (
          <p>Inspection fee: ₦{Number(listing.inspection_fee_amount).toLocaleString()}
            {listing.inspection_fee_negotiable ? ' (negotiable)' : ''}
            {listing.landlord_waives_inspection_fee ? ' — Landlord may waive' : ''}
          </p>
        )}
        {listing.rent_history_notes && <p className="rent-history">Rent history: {listing.rent_history_notes}</p>}
      </div>

      <div className="card amenities">
        <h3>Amenities & details</h3>
        <ul>
          {listing.bedrooms_count != null && <li>Bedrooms: {listing.bedrooms_count} ({listing.bedrooms_size_sqm != null ? `${listing.bedrooms_size_sqm} m²` : '—'})</li>}
          {listing.toilets_count != null && <li>Toilets: {listing.toilets_count} ({listing.toilets_size_sqm != null ? `${listing.toilets_size_sqm} m²` : '—'})</li>}
          {listing.kitchen_size_sqm != null && <li>Kitchen: {listing.kitchen_size_sqm} m²</li>}
          {listing.prepaid_meter != null && <li>Prepaid meter: {listing.prepaid_meter ? 'Yes' : 'No'}</li>}
          {listing.band_of_light && <li>Band of light: {listing.band_of_light}</li>}
          {listing.borehole_or_well != null && <li>Borehole/well: {listing.borehole_or_well ? 'Yes' : 'No'}</li>}
          {listing.neighbors_count != null && <li>Neighbors: {listing.neighbors_count}</li>}
          {listing.landlord_lives_in_house != null && <li>Landlord lives in house: {listing.landlord_lives_in_house ? 'Yes' : 'No'}</li>}
        </ul>
        {listing.description && <p>{listing.description}</p>}
      </div>

      <div className="card agent">
        <h3>Agent</h3>
        <p>{listing.agent_name}</p>
        {listing.agent_phone && <p><a href={`tel:${listing.agent_phone}`}>{listing.agent_phone}</a></p>}
        {listing.co_agents?.length > 0 && (
          <p>Co-agents: {listing.co_agents.map((a) => a.full_name).join(', ')}</p>
        )}
      </div>

      {user?.is_tenant && (
        <div className="actions card">
          <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(true)}>Report misleading listing</button>
          <button type="button" className="btn btn-primary" onClick={() => setReviewOpen(true)}>Leave a review</button>
        </div>
      )}

      {reportOpen && (
        <form className="card overlay-form" onSubmit={handleReport}>
          <h3>Report listing</h3>
          <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Reason" required />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-danger">Submit report</button>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {reviewOpen && (
        <form className="card overlay-form" onSubmit={handleReview}>
          <h3>Review</h3>
          <div className="form-group">
            <label>Overall (1–5)</label>
            <input type="number" min={1} max={5} value={reviewForm.overallRating} onChange={(e) => setReviewForm((f) => ({ ...f, overallRating: +e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Location accurate?</label>
            <input type="number" min={1} max={5} value={reviewForm.locationAccurate} onChange={(e) => setReviewForm((f) => ({ ...f, locationAccurate: +e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Amenities as described?</label>
            <input type="number" min={1} max={5} value={reviewForm.amenitiesAsDescribed} onChange={(e) => setReviewForm((f) => ({ ...f, amenitiesAsDescribed: +e.target.value }))} />
          </div>
          <div className="form-group">
            <label>No hidden fees?</label>
            <input type="number" min={1} max={5} value={reviewForm.noHiddenFees} onChange={(e) => setReviewForm((f) => ({ ...f, noHiddenFees: +e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Comment</label>
            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Submit review</button>
            <button type="button" className="btn btn-ghost" onClick={() => setReviewOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <div className="card reviews">
          <h3>Reviews</h3>
          <ul>
            {reviews.map((r) => (
              <li key={r.id}>
                <strong>{r.tenant_name}</strong> — {r.overall_rating}/5
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ marginTop: '1rem' }}>
        <Link to="/listings">← Back to listings</Link>
      </p>
    </div>
  );
}
