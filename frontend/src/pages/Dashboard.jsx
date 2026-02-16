import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';

export default function Dashboard() {
  const { user, updateRoles } = useAuth();
  const [roles, setRoles] = useState({ isAgent: user?.is_agent, isLandlord: user?.is_landlord });
  const [saving, setSaving] = useState(false);

  const handleSaveRoles = async () => {
    setSaving(true);
    try {
      await updateRoles(roles);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="card">
        <h3>Account — one login, multiple roles</h3>
        <p style={{ color: 'var(--text-muted)' }}>Turn on agent or landlord capabilities. You stay the same account.</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!roles.isAgent} onChange={(e) => setRoles((r) => ({ ...r, isAgent: e.target.checked }))} />
            I am an agent
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!roles.isLandlord} onChange={(e) => setRoles((r) => ({ ...r, isLandlord: e.target.checked }))} />
            I am a landlord
          </label>
          <button type="button" className="btn btn-primary" onClick={handleSaveRoles} disabled={saving}>
            {saving ? 'Saving…' : 'Save roles'}
          </button>
        </div>
      </div>
      {user?.is_agent && (
        <div className="card">
          <h3>Agent</h3>
          <p><Link to="/create-property" className="btn btn-primary">Add property & create listing</Link></p>
          <p><Link to="/create-listing">Create listing for existing property</Link></p>
        </div>
      )}
      {user?.is_tenant && (
        <div className="card">
          <h3>Tenant</h3>
          <p><Link to="/lifecycle">My rental lifecycle</Link> — mark house secured, saved searches, rent history, lease reminder.</p>
        </div>
      )}
      <div className="card">
        <h3>Disputes</h3>
        <p><Link to="/disputes">View reports</Link> you filed or that concern your listings.</p>
      </div>
    </div>
  );
}
