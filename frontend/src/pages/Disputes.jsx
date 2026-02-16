import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export default function Disputes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/disputes').then((r) => r.json()).then(setList).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Disputes</h1>
      <p style={{ color: 'var(--text-muted)' }}>Reports you filed or that concern your listings.</p>
      {loading ? (
        <p>Loading…</p>
      ) : list.length === 0 ? (
        <div className="card">No disputes.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.map((d) => (
            <li key={d.id} className="card" style={{ marginBottom: '1rem' }}>
              <strong>{d.listing_title}</strong>
              <p>Reason: {d.reason}</p>
              <p>Status: {d.status}</p>
              <p>Reported by: {d.reported_by_name}</p>
              {d.resolution_notes && <p>Resolution: {d.resolution_notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
