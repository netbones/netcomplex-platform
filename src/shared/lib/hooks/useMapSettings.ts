'use client';

import { useEffect, useState } from 'react';
import { logError } from '@shared/lib';

interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

interface MapStreet {
  name: string;
  coords: [number, number];
}

const DEFAULT_CENTER: MapCenter = { lat: -34.09165, lng: 18.483269, zoom: 16 };

const DEFAULT_STREETS: MapStreet[] = [
  { name: 'Pagoda Rd', coords: [-34.09165, 18.483269] },
  { name: 'Wild Almond Rd', coords: [-34.09025, 18.483569] },
  { name: 'Silkypuff Street', coords: [-34.0907, 18.483869] },
  { name: 'Beechwood Rd', coords: [-34.09131, 18.483569] },
  { name: 'Sugarbrush Rd', coords: [-34.09164, 18.483369] },
  { name: 'Conebrush Rd', coords: [-34.09101, 18.483769] },
];

interface MapSettings {
  center: MapCenter;
  streets: MapStreet[];
  loading: boolean;
}

export function useMapSettings(): MapSettings {
  const [settings, setSettings] = useState<MapSettings>({
    center: DEFAULT_CENTER,
    streets: DEFAULT_STREETS,
    loading: true,
  });

  useEffect(() => {
    fetch('/api/settings/contact')
      .then(res => res.json())
      .then((data: Record<string, string>) => {
        const centerRaw = data['map.center'];
        const streetsRaw = data['map.streets'];

        if (centerRaw) {
          try {
            const parsed = JSON.parse(centerRaw);
            if (parsed.lat != null && parsed.lng != null) {
              setSettings(prev => ({
                ...prev,
                center: {
                  lat: parsed.lat,
                  lng: parsed.lng,
                  zoom: parsed.zoom ?? 16,
                },
              }));
            }
          } catch {
            // ignore invalid JSON, use default
          }
        }

        if (streetsRaw) {
          try {
            const parsed = JSON.parse(streetsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSettings(prev => ({
                ...prev,
                streets: parsed.map((s: { name: string; coords: number[] }) => ({
                  name: s.name,
                  coords: [s.coords[0], s.coords[1]] as [number, number],
                })),
              }));
            }
          } catch {
            // ignore invalid JSON, use default
          }
        }
      })
      .catch(error =>
        logError(
          { component: 'useMapSettings', operation: 'fetch' },
          'Failed to fetch map settings',
          error
        )
      )
      .finally(() => setSettings(prev => ({ ...prev, loading: false })));
  }, []);

  return settings;
}
