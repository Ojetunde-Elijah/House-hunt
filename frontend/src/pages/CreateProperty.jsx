import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { MapPicker } from '../components/Map';

export default function CreateProperty() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    address: '',
    latitude: null,
    longitude: null,
    landmarkName: '',
    directionsFromLandmark: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setCoord = (coord) => {
    if (coord && coord.length === 2) {
      setForm((f) => ({ ...f, latitude: coord[0], longitude: coord[1] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/properties', {
        method: 'POST',
        body: JSON.stringify({
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          landmarkName: form.landmarkName || undefined,
          directionsFromLandmark: form.directionsFromLandmark || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create property');
      const prop = await res.json();
      navigate('/create-listing', { state: { propertyId: prop.id } });
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>Add property (location)</h2>
      <p style={{ color: 'var(--text-muted)' }}>Pin the exact location so tenants can navigate. Describe how to get there from a popular landmark.</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="form-group">
          <label>Address</label>
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required placeholder="Street, area, city" />
        </div>
        <div className="form-group">
          <label>Map — click to set pin / use “Use my current location”</label>
          <MapPicker value={form.latitude != null ? [form.latitude, form.longitude] : null} onChange={setCoord} />
        </div>
        <div className="form-group">
          <label>Landmark name (e.g. “Shoprite Ikeja”)</label>
          <input value={form.landmarkName} onChange={(e) => setForm((f) => ({ ...f, landmarkName: e.target.value }))} placeholder="Nearby popular landmark" />
        </div>
        <div className="form-group">
          <label>Directions from landmark</label>
          <textarea value={form.directionsFromLandmark} onChange={(e) => setForm((f) => ({ ...f, directionsFromLandmark: e.target.value }))} placeholder="e.g. Turn left at the junction, second house after the pharmacy" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save property & create listing'}</button>
      </form>
    </div>
  );
}
