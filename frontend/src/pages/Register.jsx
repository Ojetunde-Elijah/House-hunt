import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', isAgent: false, isLandlord: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/listings');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2 style={{ marginTop: 0 }}>Create account</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>One account — add agent or landlord role later.</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <div className="form-group">
          <label>Full name</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Password (min 6)</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isAgent" checked={form.isAgent} onChange={handleChange} />
            I'm an agent
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isLandlord" checked={form.isLandlord} onChange={handleChange} />
            I'm a landlord
          </label>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
