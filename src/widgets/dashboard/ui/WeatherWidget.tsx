'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantConfig } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('WeatherWidget');

/*
 * WEATHER WIDGET
 * --------------
 * Used by: SidebarWidgetBox (type: 'weather')
 *
 * Fetches real weather from Open-Meteo API (no API key required).
 * Uses tenant location from config or defaults to Soralia Village coordinates.
 * --------------
 */

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  icon: string;
}

const CONDITION_MAP: Record<string, { condition: string; icon: string }> = {
  0: { condition: 'Clear', icon: 'fas fa-sun' },
  1: { condition: 'Mainly Clear', icon: 'fas fa-sun' },
  2: { condition: 'Partly Cloudy', icon: 'fas fa-cloud-sun' },
  3: { condition: 'Overcast', icon: 'fas fa-cloud' },
  45: { condition: 'Fog', icon: 'fas fa-smog' },
  48: { condition: 'Fog', icon: 'fas fa-smog' },
  51: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
  53: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
  55: { condition: 'Drizzle', icon: 'fas fa-cloud-rain' },
  61: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
  63: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
  65: { condition: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
  71: { condition: 'Snow', icon: 'fas fa-snowflake' },
  73: { condition: 'Snow', icon: 'fas fa-snowflake' },
  75: { condition: 'Snow', icon: 'fas fa-snowflake' },
  80: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
  81: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
  82: { condition: 'Showers', icon: 'fas fa-cloud-showers-heavy' },
  95: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
  96: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
  99: { condition: 'Thunderstorm', icon: 'fas fa-bolt' },
};

interface WeatherWidgetProps {
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

export function WeatherWidget({ location }: WeatherWidgetProps) {
  const { t } = useTranslation('dashboard');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const { latitude, longitude, name } = location || tenantConfig.location;

  useEffect(() => {
    fetchWeather();
  }, [latitude, longitude]);

  const fetchWeather = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.current_weather) {
        const weatherCode = data.current_weather.weathercode ?? 0;
        const weatherInfo = CONDITION_MAP[weatherCode] || CONDITION_MAP[0];
        setWeather({
          temperature: Math.round(data.current_weather.temperature),
          condition: weatherInfo.condition,
          location: name || tenantConfig.location.name,
          icon: weatherInfo.icon,
        });
      }
    } catch (error) {
      log.error({}, 'Failed to fetch weather', error);
      setWeather({
        temperature: 72,
        condition: 'Unavailable',
        location: name || tenantConfig.location.name,
        icon: 'fas fa-cloud',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">{t('weather', 'Weather')}</h4>
        <div className="animate-pulse h-12 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">{t('weather', 'Weather')}</h4>
        <p className="text-xs text-gray-500">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{t('weather', 'Weather')}</h4>
      <div className="flex items-center gap-2">
        <i className={`${weather.icon} text-yellow-500 text-lg`}></i>
        <div>
          <div className="text-sm font-medium text-gray-900">{weather.temperature}°F</div>
          <div className="text-xs text-gray-600">{weather.condition}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{weather.location}</div>
    </div>
  );
}
