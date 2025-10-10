// Geolocation utilities for ZIP code distance search
// Uses OpenStreetMap Nominatim API (free, no API key required)

const GEOCODING_CACHE_KEY = 'servemax_geocoding_cache';
const CACHE_EXPIRY_DAYS = 30;

// Get cached coordinates for a ZIP code
const getCachedCoordinates = (zipCode) => {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODING_CACHE_KEY) || '{}');
    const cached = cache[zipCode];

    if (cached) {
      const isExpired = Date.now() - cached.timestamp > (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (!isExpired) {
        return { lat: cached.lat, lng: cached.lng };
      }
    }
  } catch (error) {
    console.warn('Error reading geocoding cache:', error);
  }
  return null;
};

// Cache coordinates for a ZIP code
const setCachedCoordinates = (zipCode, lat, lng) => {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODING_CACHE_KEY) || '{}');
    cache[zipCode] = {
      lat,
      lng,
      timestamp: Date.now()
    };

    // Keep cache size reasonable - remove old entries if cache gets too large
    const entries = Object.entries(cache);
    if (entries.length > 1000) {
      // Sort by timestamp and keep newest 500
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const trimmed = Object.fromEntries(sorted.slice(0, 500));
      localStorage.setItem(GEOCODING_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(GEOCODING_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.warn('Error caching geocoding result:', error);
  }
};

// Convert ZIP code to coordinates using Nominatim API
export const geocodeZipCode = async (zipCode, countryCode = 'US') => {
  // Validate ZIP code format
  const cleanZip = zipCode.toString().trim();
  if (!cleanZip.match(/^\d{5}(-\d{4})?$/)) {
    throw new Error('Invalid ZIP code format. Please enter a 5-digit ZIP code.');
  }

  // Check cache first
  const cached = getCachedCoordinates(cleanZip);
  if (cached) {
    return cached;
  }

  try {
    // Use Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&country=${countryCode}&postalcode=${cleanZip}&limit=1`,
      {
        headers: {
          'User-Agent': 'ServeMax Directory Search'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding service error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`No location found for ZIP code ${cleanZip}`);
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates returned from geocoding service');
    }

    // Cache the result
    setCachedCoordinates(cleanZip, lat, lng);

    return { lat, lng };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error(`Unable to find location for ZIP code ${cleanZip}. Please try a different ZIP code.`);
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  // Validate inputs
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    console.warn('Invalid coordinates for distance calculation:', { lat1, lng1, lat2, lng2 });
    return null;
  }

  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Helper function to convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Geocode a company address if coordinates are missing
export const geocodeCompanyAddress = async (company) => {
  // Skip if already has coordinates
  if (company.lat && company.lng && !isNaN(company.lat) && !isNaN(company.lng)) {
    return { lat: company.lat, lng: company.lng };
  }

  // Try to geocode using available address information
  let searchQuery = '';

  if (company.zip) {
    // Prefer ZIP code for consistency
    return await geocodeZipCode(company.zip);
  } else if (company.address && company.city && company.state) {
    // Build address query
    searchQuery = `${company.address}, ${company.city}, ${company.state}`;
  } else if (company.city && company.state) {
    // City and state only
    searchQuery = `${company.city}, ${company.state}`;
  } else {
    throw new Error('Insufficient address information for geocoding');
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'ServeMax Directory Search'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding service error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`No location found for address: ${searchQuery}`);
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates returned from geocoding service');
    }

    return { lat, lng };
  } catch (error) {
    console.error('Address geocoding error:', error);
    throw new Error(`Unable to geocode address: ${searchQuery}`);
  }
};

// Validate ZIP code format
export const isValidZipCode = (zipCode) => {
  const cleanZip = zipCode.toString().trim();
  return /^\d{5}(-\d{4})?$/.test(cleanZip);
};

// Format distance for display
export const formatDistance = (distance) => {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return 'Distance unavailable';
  }

  if (distance < 0.1) {
    return 'Less than 0.1 miles';
  }

  return `${distance.toFixed(1)} miles`;
};

// Clear geocoding cache (useful for debugging/testing)
export const clearGeocodingCache = () => {
  try {
    localStorage.removeItem(GEOCODING_CACHE_KEY);
    console.log('Geocoding cache cleared');
  } catch (error) {
    console.warn('Error clearing geocoding cache:', error);
  }
};

// Get cache statistics
export const getGeocodingCacheStats = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODING_CACHE_KEY) || '{}');
    const entries = Object.keys(cache);
    return {
      entryCount: entries.length,
      oldestEntry: entries.length > 0 ? Math.min(...Object.values(cache).map(c => c.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...Object.values(cache).map(c => c.timestamp)) : null
    };
  } catch (error) {
    return { entryCount: 0, oldestEntry: null, newestEntry: null };
  }
};