'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapSettings } from '@shared/lib/hooks/useMapSettings';
import { useTenant } from '@entities/tenant';

const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export default function MapContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { center, streets, loading } = useMapSettings();
  const tenant = useTenant();
  const tenantName = tenant?.name || 'Netcomplex Demo Village';

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !center) return;

    fixLeafletIcons();

    const map = L.map(mapRef.current).setView([center.lat, center.lng], center.zoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    streets.forEach(street => {
      L.marker(street.coords).addTo(map).bindPopup(`<b>${street.name}</b><br>${tenantName}`);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, streets, tenantName]);

  if (loading) {
    return (
      <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Loading map...</span>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Map location unavailable</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative z-0">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
