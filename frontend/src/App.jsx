import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import CreateProperty from './pages/CreateProperty';
import Dashboard from './pages/Dashboard';
import Lifecycle from './pages/Lifecycle';
import Disputes from './pages/Disputes';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="listings" element={<Listings />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="create-property" element={<PrivateRoute><CreateProperty /></PrivateRoute>} />
          <Route path="create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
          <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="lifecycle" element={<PrivateRoute><Lifecycle /></PrivateRoute>} />
          <Route path="disputes" element={<PrivateRoute><Disputes /></PrivateRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
