import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const defaultCenter = [6.5244, 3.3792]; // Lagos

export function MapView({ center, zoom = 14, markers = [], height = 280, className = '' }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const [lat, lng] = center && center.length === 2 ? center : defaultCenter;
    mapRef.current = L.map(containerRef.current).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !center) return;
    const [lat, lng] = center.length === 2 ? center : defaultCenter;
    mapRef.current.setView([lat, lng], zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const list = Array.isArray(markers) ? markers : (markers ? [markers] : []);
    list.forEach((pos) => {
      if (!pos || !pos[0] || !pos[1]) return;
      const marker = L.marker([pos[0], pos[1]]).addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [markers]);

  return <div ref={containerRef} className={className} style={{ height, borderRadius: 12, overflow: 'hidden' }} />;
}

export function MapPicker({ value, onChange, height = 320 }) {
  const [position, setPosition] = useState(value || defaultCenter);
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const [lat, lng] = position;
    mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(mapRef.current);
    markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      markerRef.current?.setLatLng([lat, lng]);
      onChange?.([lat, lng]);
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && position) markerRef.current.setLatLng(position);
  }, [position]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const [lat, lng] = [pos.coords.latitude, pos.coords.longitude];
        setPosition([lat, lng]);
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], 16);
        onChange?.([lat, lng]);
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div>
      <div ref={containerRef} style={{ height, borderRadius: 12, overflow: 'hidden' }} />
      <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={useMyLocation} disabled={gettingLocation}>
        {gettingLocation ? 'Getting location…' : 'Use my current location'}
      </button>
    </div>
  );
}
