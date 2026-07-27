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

interface MapSettings {
  center: MapCenter | null;
  streets: MapStreet[];
  loading: boolean;
}

interface SettingResponse {
  data: {
    key: string;
    value: string | null;
  };
}

async function fetchSetting(key: string): Promise<string | null> {
  const res = await fetch(`/api/settings/${key}`);
  const envelope: SettingResponse = await res.json();
  return envelope?.data?.value ?? null;
}

export function useMapSettings(): MapSettings {
  const [settings, setSettings] = useState<MapSettings>({
    center: null,
    streets: [],
    loading: true,
  });

  useEffect(() => {
    Promise.all([fetchSetting('map.center'), fetchSetting('map.streets')])
      .then(([centerRaw, streetsRaw]) => {
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
            // ignore invalid JSON
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
            // ignore invalid JSON
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
