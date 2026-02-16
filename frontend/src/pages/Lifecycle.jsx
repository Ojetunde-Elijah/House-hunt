import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import './Lifecycle.css';

export default function Lifecycle() {
  const [profile, setProfile] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [rentHistory, setRentHistory] = useState([]);
  const [reminder, setReminder] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ isSearching: true, leaseEndDate: '', preferredAreas: '', minBudget: '', maxBudget: '', bedroomsWanted: '', securedListingId: '' });
  const [saveSearchName, setSaveSearchName] = useState('');
  const [rentForm, setRentForm] = useState({ amount: '', periodStart: '', periodEnd: '', note: '' });
  const [checklistForm, setChecklistForm] = useState({ type: 'move_in', items: '' });

  useEffect(() => {
    api('/lifecycle/profile').then((r) => r.json()).then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      isSearching: !!profile.is_searching,
      leaseEndDate: profile.lease_end_date || '',
      preferredAreas: profile.preferred_areas || '',
      minBudget: profile.min_budget ?? '',
      maxBudget: profile.max_budget ?? '',
      bedroomsWanted: profile.bedrooms_wanted ?? '',
      securedListingId: profile.secured_listing_id ?? '',
    });
  }, [profile]);

  useEffect(() => {
    api('/lifecycle/saved-searches').then((r) => r.json()).then(setSavedSearches).catch(() => setSavedSearches([]));
  }, []);

  useEffect(() => {
    api('/lifecycle/rent-history').then((r) => r.json()).then(setRentHistory).catch(() => setRentHistory([]));
  }, []);

  useEffect(() => {
    api('/lifecycle/lease-reminders').then((r) => r.json()).then((d) => setReminder(d.reminder)).catch(() => setReminder(null));
  }, [profile?.lease_end_date]);

  useEffect(() => {
    api('/lifecycle/checklists').then((r) => r.json()).then(setChecklists).catch(() => setChecklists([]));
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [profile]);

  const saveProfile = async (e) => {
    e?.preventDefault();
    const res = await api('/lifecycle/profile', {
      method: 'PUT',
      body: JSON.stringify({
        isSearching: form.isSearching,
        leaseEndDate: form.leaseEndDate || undefined,
        preferredAreas: form.preferredAreas || undefined,
        minBudget: form.minBudget ? parseFloat(form.minBudget) : undefined,
        maxBudget: form.maxBudget ? parseFloat(form.maxBudget) : undefined,
        bedroomsWanted: form.bedroomsWanted ? parseInt(form.bedroomsWanted, 10) : undefined,
        securedListingId: form.securedListingId ? parseInt(form.securedListingId, 10) : undefined,
      }),
    });
    if (res.ok) setProfile(await res.json());
  };

  const addSavedSearch = async (e) => {
    e.preventDefault();
    const res = await api('/lifecycle/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name: saveSearchName || 'Saved search', filters: {} }),
    });
    if (res.ok) {
      const s = await res.json();
      setSavedSearches((prev) => [s, ...prev]);
      setSaveSearchName('');
    }
  };

  const addRentEntry = async (e) => {
    e.preventDefault();
    const res = await api('/lifecycle/rent-history', {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(rentForm.amount),
        periodStart: rentForm.periodStart || undefined,
        periodEnd: rentForm.periodEnd || undefined,
        note: rentForm.note || undefined,
      }),
    });
    if (res.ok) {
      const r = await res.json();
      setRentHistory((prev) => [r, ...prev]);
      setRentForm({ amount: '', periodStart: '', periodEnd: '', note: '' });
    }
  };

  const addChecklist = async (e) => {
    e.preventDefault();
    const items = checklistForm.items.split('\n').filter(Boolean).map((t) => ({ text: t, done: false }));
    const res = await api('/lifecycle/checklists', {
      method: 'POST',
      body: JSON.stringify({ type: checklistForm.type, items }),
    });
    if (res.ok) {
      const c = await res.json();
      setChecklists((prev) => [c, ...prev]);
      setChecklistForm({ type: 'move_in', items: '' });
    }
  };

  if (loading) return <div className="card">Loading…</div>;

  return (
    <div className="lifecycle-page">
      <h1>My rental lifecycle</h1>
      {reminder && (
        <div className="card reminder">
          <strong>Lease reminder</strong>
          <p>{reminder.message}</p>
          <p>Lease end: {reminder.leaseEndDate}</p>
          <Link to="/listings" className="btn btn-primary">Browse listings</Link>
        </div>
      )}

      <div className="tabs">
        <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
        <button type="button" className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Saved searches</button>
        <button type="button" className={tab === 'rent' ? 'active' : ''} onClick={() => setTab('rent')}>Rent history</button>
        <button type="button" className={tab === 'checklist' ? 'active' : ''} onClick={() => setTab('checklist')}>Move-in/out checklist</button>
      </div>

      {tab === 'profile' && (
        <div className="card">
          <h3>Tenant status</h3>
          <form onSubmit={saveProfile}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isSearching} onChange={(e) => setForm((f) => ({ ...f, isSearching: e.target.checked }))} />
              I am currently searching for a house
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When you secure a house, uncheck this. We’ll remind you when your lease is ending.</p>
            <div className="form-group">
              <label>Lease end date</label>
              <input type="date" value={form.leaseEndDate} onChange={(e) => setForm((f) => ({ ...f, leaseEndDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Preferred areas</label>
              <input value={form.preferredAreas} onChange={(e) => setForm((f) => ({ ...f, preferredAreas: e.target.value }))} placeholder="e.g. Ikeja, Lekki" />
            </div>
            <div className="form-group">
              <label>Budget (min – max ₦)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" placeholder="Min" value={form.minBudget} onChange={(e) => setForm((f) => ({ ...f, minBudget: e.target.value }))} />
                <input type="number" placeholder="Max" value={form.maxBudget} onChange={(e) => setForm((f) => ({ ...f, maxBudget: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Bedrooms wanted</label>
              <input type="number" min={0} value={form.bedroomsWanted} onChange={(e) => setForm((f) => ({ ...f, bedroomsWanted: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </div>
      )}

      {tab === 'saved' && (
        <div className="card">
          <h3>Saved searches</h3>
          <form onSubmit={addSavedSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input value={saveSearchName} onChange={(e) => setSaveSearchName(e.target.value)} placeholder="Search name" />
            <button type="submit" className="btn btn-primary">Save current search</button>
          </form>
          <ul className="list">
            {savedSearches.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
            {savedSearches.length === 0 && <li className="muted">None yet.</li>}
          </ul>
        </div>
      )}

      {tab === 'rent' && (
        <div className="card">
          <h3>Rent history</h3>
          <form onSubmit={addRentEntry} className="form-inline">
            <input type="number" step={0.01} placeholder="Amount" value={rentForm.amount} onChange={(e) => setRentForm((f) => ({ ...f, amount: e.target.value }))} required />
            <input type="month" placeholder="From" value={rentForm.periodStart} onChange={(e) => setRentForm((f) => ({ ...f, periodStart: e.target.value }))} />
            <input type="month" placeholder="To" value={rentForm.periodEnd} onChange={(e) => setRentForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            <input placeholder="Note" value={rentForm.note} onChange={(e) => setRentForm((f) => ({ ...f, note: e.target.value }))} />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
          <ul className="list">
            {rentHistory.map((r) => (
              <li key={r.id}>₦{Number(r.amount).toLocaleString()} {r.period_start && `(${r.period_start} – ${r.period_end || '…'})`} {r.note && `— ${r.note}`}</li>
            ))}
            {rentHistory.length === 0 && <li className="muted">No entries.</li>}
          </ul>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="card">
          <h3>Move-in / move-out checklist</h3>
          <p style={{ color: 'var(--text-muted)' }}>Document condition to protect your deposit.</p>
          <form onSubmit={addChecklist}>
            <select value={checklistForm.type} onChange={(e) => setChecklistForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="move_in">Move-in</option>
              <option value="move_out">Move-out</option>
            </select>
            <div className="form-group">
              <label>Items (one per line)</label>
              <textarea value={checklistForm.items} onChange={(e) => setChecklistForm((f) => ({ ...f, items: e.target.value }))} placeholder="e.g. Walls painted\nFittings working" />
            </div>
            <button type="submit" className="btn btn-primary">Create checklist</button>
          </form>
          <ul className="list">
            {checklists.map((c) => (
              <li key={c.id}>{c.type.replace('_', '-')} — {c.items?.length ?? 0} items</li>
            ))}
            {checklists.length === 0 && <li className="muted">None yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
