import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1>House Hunt</h1>
        <p className="tagline">Rental Lifecycle Manager — find a place, stay in our ecosystem, move when you're ready.</p>
        <div className="hero-actions">
          <Link to="/listings" className="btn btn-primary">Browse listings</Link>
          <Link to="/register" className="btn btn-ghost">Sign up</Link>
        </div>
      </section>
      <section className="features">
        <div className="card">
          <h3>Accurate locations</h3>
          <p>Map pins, directions from landmarks, and your GPS so you're never sent to the wrong place.</p>
        </div>
        <div className="card">
          <h3>Full cost breakdown</h3>
          <p>Agency, legal, caution deposit, service charge — no hidden fees. Rent history where available.</p>
        </div>
        <div className="card">
          <h3>Structured details</h3>
          <p>Bedrooms, toilets, kitchen sizes, prepaid meter, borehole, neighbors, landlord on-site — we prompt agents to fill it all.</p>
        </div>
        <div className="card">
          <h3>Lifecycle, not one-off</h3>
          <p>Mark "House secured", come back when your lease is ending. Saved searches, rent history, move-in/out checklists.</p>
        </div>
      </section>
    </div>
  );
}
