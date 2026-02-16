import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">House Hunt</Link>
        <nav className="nav">
          <Link to="/listings">Listings</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              {user.is_tenant && <Link to="/lifecycle">My Rental</Link>}
              <Link to="/disputes">Disputes</Link>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>House Hunt — Rental Lifecycle Manager</span>
      </footer>
    </div>
  );
}
