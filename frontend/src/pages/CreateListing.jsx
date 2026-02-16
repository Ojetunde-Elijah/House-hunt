import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../context/AuthContext';

export default function CreateListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const propertyIdFromState = location.state?.propertyId;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    propertyId: propertyIdFromState || '',
    title: '',
    description: '',
    verificationTier: 'unverified',
    inspectionFeeAmount: '',
    inspectionFeeNegotiable: false,
    landlordWaivesInspectionFee: false,
    agencyFee: '',
    legalFee: '',
    cautionDeposit: '',
    serviceCharge: '',
    monthlyRent: '',
    rentHistoryNotes: '',
    bedroomsCount: '',
    bedroomsSizeSqm: '',
    toiletsCount: '',
    toiletsSizeSqm: '',
    kitchenSizeSqm: '',
    prepaidMeter: '',
    bandOfLight: '',
    boreholeOrWell: '',
    neighborsCount: '',
    landlordLivesInHouse: '',
  });

  useEffect(() => {
    api('/properties').then((r) => r.json()).then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    if (propertyIdFromState) setForm((f) => ({ ...f, propertyId: propertyIdFromState }));
  }, [propertyIdFromState]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      propertyId: parseInt(form.propertyId, 10),
      title: form.title,
      description: form.description || undefined,
      verificationTier: form.verificationTier,
      inspectionFeeAmount: form.inspectionFeeAmount ? parseFloat(form.inspectionFeeAmount) : undefined,
      inspectionFeeNegotiable: !!form.inspectionFeeNegotiable,
      landlordWaivesInspectionFee: !!form.landlordWaivesInspectionFee,
      agencyFee: form.agencyFee ? parseFloat(form.agencyFee) : undefined,
      legalFee: form.legalFee ? parseFloat(form.legalFee) : undefined,
      cautionDeposit: form.cautionDeposit ? parseFloat(form.cautionDeposit) : undefined,
      serviceCharge: form.serviceCharge ? parseFloat(form.serviceCharge) : undefined,
      monthlyRent: parseFloat(form.monthlyRent),
      rentHistoryNotes: form.rentHistoryNotes || undefined,
      bedroomsCount: form.bedroomsCount ? parseInt(form.bedroomsCount, 10) : undefined,
      bedroomsSizeSqm: form.bedroomsSizeSqm ? parseFloat(form.bedroomsSizeSqm) : undefined,
      toiletsCount: form.toiletsCount ? parseInt(form.toiletsCount, 10) : undefined,
      toiletsSizeSqm: form.toiletsSizeSqm ? parseFloat(form.toiletsSizeSqm) : undefined,
      kitchenSizeSqm: form.kitchenSizeSqm ? parseFloat(form.kitchenSizeSqm) : undefined,
      prepaidMeter: form.prepaidMeter === '' ? undefined : form.prepaidMeter === 'yes',
      bandOfLight: form.bandOfLight || undefined,
      boreholeOrWell: form.boreholeOrWell === '' ? undefined : form.boreholeOrWell === 'yes',
      neighborsCount: form.neighborsCount ? parseInt(form.neighborsCount, 10) : undefined,
      landlordLivesInHouse: form.landlordLivesInHouse === '' ? undefined : form.landlordLivesInHouse === 'yes',
    };
    try {
      const res = await api('/listings', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create listing');
      }
      const listing = await res.json();
      navigate(`/listings/${listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Create listing</h2>
      <p style={{ color: 'var(--text-muted)' }}>Fill as many details as possible. Good descriptions are promoted.</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="form-group">
          <label>Property</label>
          <select value={form.propertyId} onChange={(e) => update('propertyId', e.target.value)} required>
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={(e) => update('title', e.target.value)} required placeholder="e.g. 3-bed flat, Ikeja" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Verification tier</label>
          <select value={form.verificationTier} onChange={(e) => update('verificationTier', e.target.value)}>
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
            <option value="premium_verified">Premium verified</option>
          </select>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Costs (all upfront)</h3>
        <div className="form-group">
          <label>Monthly rent (₦) *</label>
          <input type="number" min={0} step={0.01} value={form.monthlyRent} onChange={(e) => update('monthlyRent', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Agency fee (₦)</label>
          <input type="number" min={0} step={0.01} value={form.agencyFee} onChange={(e) => update('agencyFee', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Legal fee (₦)</label>
          <input type="number" min={0} step={0.01} value={form.legalFee} onChange={(e) => update('legalFee', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Caution deposit (₦)</label>
          <input type="number" min={0} step={0.01} value={form.cautionDeposit} onChange={(e) => update('cautionDeposit', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Service charge (₦)</label>
          <input type="number" min={0} step={0.01} value={form.serviceCharge} onChange={(e) => update('serviceCharge', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Inspection fee (₦)</label>
          <input type="number" min={0} step={0.01} value={form.inspectionFeeAmount} onChange={(e) => update('inspectionFeeAmount', e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={form.inspectionFeeNegotiable} onChange={(e) => update('inspectionFeeNegotiable', e.target.checked)} />
          Inspection fee negotiable
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="checkbox" checked={form.landlordWaivesInspectionFee} onChange={(e) => update('landlordWaivesInspectionFee', e.target.checked)} />
          Landlord may waive inspection fee
        </label>
        <div className="form-group">
          <label>Rent history notes (if known)</label>
          <input value={form.rentHistoryNotes} onChange={(e) => update('rentHistoryNotes', e.target.value)} placeholder="e.g. Was ₦X last year" />
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Amenities & details</h3>
        <div className="form-group">
          <label>Bedrooms (count)</label>
          <input type="number" min={0} value={form.bedroomsCount} onChange={(e) => update('bedroomsCount', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Bedrooms size (m²)</label>
          <input type="number" min={0} step={0.1} value={form.bedroomsSizeSqm} onChange={(e) => update('bedroomsSizeSqm', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Toilets (count)</label>
          <input type="number" min={0} value={form.toiletsCount} onChange={(e) => update('toiletsCount', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Toilets size (m²)</label>
          <input type="number" min={0} step={0.1} value={form.toiletsSizeSqm} onChange={(e) => update('toiletsSizeSqm', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Kitchen size (m²)</label>
          <input type="number" min={0} step={0.1} value={form.kitchenSizeSqm} onChange={(e) => update('kitchenSizeSqm', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Prepaid meter</label>
          <select value={form.prepaidMeter} onChange={(e) => update('prepaidMeter', e.target.value)}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="form-group">
          <label>Band of light</label>
          <input value={form.bandOfLight} onChange={(e) => update('bandOfLight', e.target.value)} placeholder="e.g. B1" />
        </div>
        <div className="form-group">
          <label>Borehole/well</label>
          <select value={form.boreholeOrWell} onChange={(e) => update('boreholeOrWell', e.target.value)}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="form-group">
          <label>How many neighbors?</label>
          <input type="number" min={0} value={form.neighborsCount} onChange={(e) => update('neighborsCount', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Does landlord live in house?</label>
          <select value={form.landlordLivesInHouse} onChange={(e) => update('landlordLivesInHouse', e.target.value)}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Creating…' : 'Create listing'}
        </button>
      </form>
    </div>
  );
}
