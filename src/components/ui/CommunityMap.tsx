'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export function CommunityMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    fixLeafletIcons();

    const map = L.map(mapRef.current).setView([-33.9875, 18.4711], 16);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const streets: { name: string; coords: [number, number] }[] = [
      { name: 'Pagoda Rd', coords: [-33.9875, 18.4711] },
      { name: 'Wild Almond Rd', coords: [-33.9885, 18.4721] },
      { name: 'Silkypuff Street', coords: [-33.9865, 18.4701] },
      { name: 'Beechwood Rd', coords: [-33.9895, 18.4731] },
    ];

    streets.forEach(street => {
      L.marker(street.coords).addTo(map).bindPopup(`<b>${street.name}</b><br>Soralia Village`);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
