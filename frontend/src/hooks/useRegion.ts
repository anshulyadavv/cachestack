// hooks/useRegion.ts
// Detects user's region via the ipapi.co API (free, no key needed).
// Returns structured info used by Sidebar (instance label) and footer.
import { useState, useEffect } from 'react';

export interface RegionInfo {
  city: string;           // e.g. "New Delhi"
  regionName: string;     // e.g. "Delhi"
  country: string;        // e.g. "IN"
  countryName: string;    // e.g. "India"
  label: string;          // e.g. "NEW_DELHI_REGION" — used in sidebar instance line
  display: string;        // e.g. "New Delhi, India" — human readable for footer
  loading: boolean;
}

const FALLBACK: RegionInfo = {
  city: '',
  regionName: '',
  country: '',
  countryName: '',
  label: 'LOCAL_REGION',
  display: 'Local',
  loading: true,
};

export function useRegion(): RegionInfo {
  const [info, setInfo] = useState<RegionInfo>(FALLBACK);

  useEffect(() => {
    fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) {
          setInfo({ ...FALLBACK, loading: false, label: 'LOCAL_REGION', display: 'Local' });
          return;
        }

        const city        = data.city        ?? '';
        const regionName  = data.region      ?? '';
        const country     = data.country_code ?? data.country ?? '';
        const countryName = data.country_name ?? country;

        // Label for sidebar instance line: "NEW_DELHI_REGION"
        const slugCity = city.toUpperCase().replace(/\s+/g, '_');
        const label    = slugCity ? `${slugCity}_REGION` : `${country.toUpperCase()}_REGION`;

        // Human-readable for footer: "New Delhi, India"
        const parts   = [city, countryName].filter(Boolean);
        const display = parts.join(', ') || 'Local';

        setInfo({ city, regionName, country, countryName, label, display, loading: false });
      })
      .catch(() => {
        setInfo({ ...FALLBACK, loading: false });
      });
  }, []);

  return info;
}
