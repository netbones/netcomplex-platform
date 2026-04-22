'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    fixLeafletIcons();

    const map = L.map(mapRef.current).setView([-34.09165, 18.483269], 16);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const streets: { name: string; coords: [number, number] }[] = [
      { name: 'Pagoda Rd', coords: [-34.09165, 18.483269] },
      { name: 'Wild Almond Rd', coords: [-34.09025, 18.483569] },
      { name: 'Silkypuff Street', coords: [-34.0907, 18.483869] },
      { name: 'Beechwood Rd', coords: [-34.09131, 18.483569] },
      { name: 'Sugarbrush Rd', coords: [-34.09164, 18.483369] },
      { name: 'Conebrush Rd', coords: [-34.09101, 18.483769] },
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
    <div className="h-full w-full relative z-0">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
