'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantConfig } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { Sun, CloudSun, Cloud, CloudFog, CloudRain, Snowflake, Zap } from 'lucide-react';

const log = createComponentLogger('WeatherWidget');

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  Snowflake,
  Zap,
};

function WeatherIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

const CONDITION_MAP: Record<string, { condition: string; icon: string }> = {
  0: { condition: 'Clear', icon: 'Sun' },
  1: { condition: 'Mainly Clear', icon: 'Sun' },
  2: { condition: 'Partly Cloudy', icon: 'CloudSun' },
  3: { condition: 'Overcast', icon: 'Cloud' },
  45: { condition: 'Fog', icon: 'CloudFog' },
  48: { condition: 'Fog', icon: 'CloudFog' },
  51: { condition: 'Drizzle', icon: 'CloudRain' },
  53: { condition: 'Drizzle', icon: 'CloudRain' },
  55: { condition: 'Drizzle', icon: 'CloudRain' },
  61: { condition: 'Rain', icon: 'CloudRain' },
  63: { condition: 'Rain', icon: 'CloudRain' },
  65: { condition: 'Rain', icon: 'CloudRain' },
  71: { condition: 'Snow', icon: 'Snowflake' },
  73: { condition: 'Snow', icon: 'Snowflake' },
  75: { condition: 'Snow', icon: 'Snowflake' },
  80: { condition: 'Showers', icon: 'CloudRain' },
  81: { condition: 'Showers', icon: 'CloudRain' },
  82: { condition: 'Showers', icon: 'CloudRain' },
  95: { condition: 'Thunderstorm', icon: 'Zap' },
  96: { condition: 'Thunderstorm', icon: 'Zap' },
  99: { condition: 'Thunderstorm', icon: 'Zap' },
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
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    location: string;
    icon: string;
  } | null>(null);
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
        icon: 'Cloud',
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
        <WeatherIcon name={weather.icon} className="text-yellow-500 text-lg" />
        <div>
          <div className="text-sm font-medium text-gray-900">{weather.temperature}°F</div>
          <div className="text-xs text-gray-600">{weather.condition}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{weather.location}</div>
    </div>
  );
}
