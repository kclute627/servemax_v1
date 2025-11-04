import exifr from 'exifr';

/**
 * Extract comprehensive metadata from image and video files
 * Includes EXIF data, GPS coordinates, timestamps, camera info, etc.
 */

/**
 * Convert GPS coordinates from EXIF format to decimal degrees
 */
function convertGPSToDecimal(gpsArray, ref) {
  if (!gpsArray || gpsArray.length !== 3) return null;

  const degrees = gpsArray[0];
  const minutes = gpsArray[1];
  const seconds = gpsArray[2];

  let decimal = degrees + (minutes / 60) + (seconds / 3600);

  // Apply reference (N/S for latitude, E/W for longitude)
  if (ref === 'S' || ref === 'W') {
    decimal *= -1;
  }

  return decimal;
}

/**
 * Extract metadata from image file
 */
async function extractImageMetadata(file) {
  try {
    // Extract full EXIF data
    const exif = await exifr.parse(file, {
      // Extract all available tags
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      ifd0: true,
      ifd1: true,
      interop: true,
      // Merge all segments into one object
      mergeOutput: true,
      // Return null for missing tags instead of undefined
      silentErrors: true
    });

    if (!exif) {
      console.log('No EXIF data found in image');
      return null;
    }

    // Extract and format relevant metadata
    const metadata = {
      // GPS Data
      gps_latitude: exif.latitude || null,
      gps_longitude: exif.longitude || null,
      gps_altitude: exif.GPSAltitude || null,
      gps_altitude_ref: exif.GPSAltitudeRef || null,
      gps_speed: exif.GPSSpeed || null,
      gps_speed_ref: exif.GPSSpeedRef || null,
      gps_img_direction: exif.GPSImgDirection || null,
      gps_img_direction_ref: exif.GPSImgDirectionRef || null,
      gps_date_stamp: exif.GPSDateStamp || null,
      gps_timestamp: exif.GPSTimeStamp || null,

      // Timestamp Data
      date_time_original: exif.DateTimeOriginal || null,
      date_time_digitized: exif.DateTimeDigitized || null,
      date_time: exif.DateTime || null,
      timezone_offset: exif.OffsetTime || exif.OffsetTimeOriginal || null,
      subsec_time_original: exif.SubSecTimeOriginal || null,

      // Camera/Device Information
      make: exif.Make || null,
      model: exif.Model || null,
      software: exif.Software || null,
      lens_make: exif.LensMake || null,
      lens_model: exif.LensModel || null,

      // Image Settings
      orientation: exif.Orientation || null,
      x_resolution: exif.XResolution || null,
      y_resolution: exif.YResolution || null,
      resolution_unit: exif.ResolutionUnit || null,

      // Camera Settings
      exposure_time: exif.ExposureTime || null,
      f_number: exif.FNumber || null,
      iso: exif.ISO || null,
      focal_length: exif.FocalLength || null,
      focal_length_35mm: exif.FocalLengthIn35mmFormat || null,
      exposure_program: exif.ExposureProgram || null,
      exposure_mode: exif.ExposureMode || null,
      white_balance: exif.WhiteBalance || null,
      metering_mode: exif.MeteringMode || null,
      flash: exif.Flash || null,

      // Image Characteristics
      color_space: exif.ColorSpace || null,
      pixel_x_dimension: exif.PixelXDimension || null,
      pixel_y_dimension: exif.PixelYDimension || null,
      compression: exif.Compression || null,

      // Additional Info
      scene_type: exif.SceneType || null,
      scene_capture_type: exif.SceneCaptureType || null,
      contrast: exif.Contrast || null,
      saturation: exif.Saturation || null,
      sharpness: exif.Sharpness || null,
      brightness_value: exif.BrightnessValue || null,

      // Copyright and Artist
      copyright: exif.Copyright || null,
      artist: exif.Artist || null,

      // Raw EXIF for debugging/future use
      raw_exif: exif
    };

    // Clean up null values
    const cleanedMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    console.log('Extracted image metadata:', cleanedMetadata);
    return cleanedMetadata;

  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return null;
  }
}

/**
 * Extract basic metadata from video file
 */
async function extractVideoMetadata(file) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = function() {
        const metadata = {
          duration: video.duration || null,
          video_width: video.videoWidth || null,
          video_height: video.videoHeight || null,
        };

        // Clean up
        URL.revokeObjectURL(video.src);

        console.log('Extracted video metadata:', metadata);
        resolve(metadata);
      };

      video.onerror = function() {
        console.error('Error loading video metadata');
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error extracting video metadata:', error);
      resolve(null);
    }
  });
}

/**
 * Get device and browser information
 */
function getDeviceInfo() {
  const userAgent = navigator.userAgent;

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  return {
    user_agent: userAgent,
    device_type: isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop'),
    is_mobile: isMobile,
    is_tablet: isTablet,
    is_ios: isIOS,
    is_android: isAndroid,
    platform: navigator.platform || null,
    language: navigator.language || null,
    screen_width: window.screen.width || null,
    screen_height: window.screen.height || null,
    viewport_width: window.innerWidth || null,
    viewport_height: window.innerHeight || null,
    color_depth: window.screen.colorDepth || null,
    pixel_ratio: window.devicePixelRatio || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    timezone_offset: new Date().getTimezoneOffset() || null,
  };
}

/**
 * Get current browser location (if permission granted)
 */
async function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          browser_latitude: position.coords.latitude,
          browser_longitude: position.coords.longitude,
          browser_accuracy: position.coords.accuracy,
          browser_altitude: position.coords.altitude,
          browser_altitude_accuracy: position.coords.altitudeAccuracy,
          browser_heading: position.coords.heading,
          browser_speed: position.coords.speed,
          browser_timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        console.log('Browser location not available:', error.message);
        resolve(null);
      },
      options
    );
  });
}

/**
 * Main function to extract all metadata from a file
 */
export async function extractFileMetadata(file, options = {}) {
  const { includeBrowserLocation = true } = options;

  // Basic file info
  const baseMetadata = {
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    last_modified: new Date(file.lastModified).toISOString(),
    upload_timestamp: new Date().toISOString(),
  };

  // Device and browser info
  const deviceInfo = getDeviceInfo();

  // Extract media-specific metadata
  let mediaMetadata = null;
  if (file.type.startsWith('image/')) {
    mediaMetadata = await extractImageMetadata(file);
  } else if (file.type.startsWith('video/')) {
    mediaMetadata = await extractVideoMetadata(file);
  }

  // Get browser location (if enabled and available)
  let browserLocation = null;
  if (includeBrowserLocation) {
    browserLocation = await getBrowserLocation();
  }

  // Combine all metadata
  const fullMetadata = {
    ...baseMetadata,
    ...deviceInfo,
    ...mediaMetadata,
    ...browserLocation,

    // Flag indicating if photo has embedded GPS
    has_embedded_gps: !!(mediaMetadata?.gps_latitude && mediaMetadata?.gps_longitude),

    // Flag indicating if browser location was captured
    has_browser_location: !!browserLocation,
  };

  console.log('Full metadata extracted:', fullMetadata);
  return fullMetadata;
}

/**
 * Format metadata for display in UI
 */
export function formatMetadataForDisplay(metadata) {
  const sections = [];

  // GPS Information
  if (metadata.gps_latitude && metadata.gps_longitude) {
    sections.push({
      title: 'Photo GPS Location',
      items: [
        { label: 'Latitude', value: metadata.gps_latitude.toFixed(6) },
        { label: 'Longitude', value: metadata.gps_longitude.toFixed(6) },
        { label: 'Altitude', value: metadata.gps_altitude ? `${metadata.gps_altitude.toFixed(1)}m` : 'N/A' },
      ]
    });
  }

  // Browser Location (if different from photo GPS)
  if (metadata.browser_latitude && metadata.browser_longitude) {
    sections.push({
      title: 'Upload Location',
      items: [
        { label: 'Latitude', value: metadata.browser_latitude.toFixed(6) },
        { label: 'Longitude', value: metadata.browser_longitude.toFixed(6) },
        { label: 'Accuracy', value: metadata.browser_accuracy ? `±${metadata.browser_accuracy.toFixed(0)}m` : 'N/A' },
      ]
    });
  }

  // Timestamp Information
  if (metadata.date_time_original || metadata.upload_timestamp) {
    sections.push({
      title: 'Timestamps',
      items: [
        { label: 'Photo Taken', value: metadata.date_time_original || 'N/A' },
        { label: 'Uploaded', value: new Date(metadata.upload_timestamp).toLocaleString() },
      ]
    });
  }

  // Camera Information
  if (metadata.make || metadata.model) {
    sections.push({
      title: 'Camera',
      items: [
        { label: 'Make', value: metadata.make || 'N/A' },
        { label: 'Model', value: metadata.model || 'N/A' },
      ]
    });
  }

  // Device Information
  sections.push({
    title: 'Device',
    items: [
      { label: 'Type', value: metadata.device_type || 'Unknown' },
      { label: 'Platform', value: metadata.platform || 'Unknown' },
    ]
  });

  return sections;
}

export default {
  extractFileMetadata,
  formatMetadataForDisplay,
};
