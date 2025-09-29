import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, User, Edit, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Simple Google Maps component
const AttemptMap = ({ attemptLat, attemptLng, jobAddress, jobLat, jobLng }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const initializeMap = useCallback(() => {
    try {
      const mapElement = document.getElementById(`attempt-map-${attemptLat}-${attemptLng}`);
      if (!mapElement || !window.google || !window.google.maps) return;

      // Create map centered between attempt and job address (if both exist)
      let centerLat, centerLng, zoom = 15;
      
      if (jobLat && jobLng) {
        // Center between the two points
        centerLat = (attemptLat + jobLat) / 2;
        centerLng = (attemptLng + jobLng) / 2;
        zoom = 14; // Zoom out a bit to show both markers
      } else {
        // Center on attempt location
        centerLat = attemptLat;
        centerLng = attemptLng;
      }

      const map = new window.google.maps.Map(mapElement, {
        center: { lat: centerLat, lng: centerLng },
        zoom: zoom,
        mapTypeId: 'roadmap'
      });

      // Add attempt location marker (red)
      const attemptMarker = new window.google.maps.Marker({
        position: { lat: attemptLat, lng: attemptLng },
        map: map,
        title: 'Service Attempt Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#dc2626',
          strokeWeight: 2,
        }
      });

      // Add job address marker (blue) if coordinates exist
      if (jobLat && jobLng) {
        const jobMarker = new window.google.maps.Marker({
          position: { lat: jobLat, lng: jobLng },
          map: map,
          title: 'Job Service Address',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#1d4ed8',
            strokeWeight: 2,
          }
        });

        // Add info windows
        const attemptInfoWindow = new window.google.maps.InfoWindow({
          content: '<div class="text-sm"><strong>Attempt Location</strong><br/>GPS Coordinates</div>'
        });

        const jobInfoWindow = new window.google.maps.InfoWindow({
          content: `<div class="text-sm"><strong>Service Address</strong><br/>${jobAddress || 'Job Address'}</div>`
        });

        attemptMarker.addListener('click', () => {
          jobInfoWindow.close();
          attemptInfoWindow.open(map, attemptMarker);
        });

        jobMarker.addListener('click', () => {
          attemptInfoWindow.close();
          jobInfoWindow.open(map, jobMarker);
        });
      } else {
        // Just add info window for attempt marker
        const attemptInfoWindow = new window.google.maps.InfoWindow({
          content: '<div class="text-sm"><strong>Attempt Location</strong><br/>GPS Coordinates</div>'
        });

        attemptMarker.addListener('click', () => {
          attemptInfoWindow.open(map, attemptMarker);
        });
      }

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [attemptLat, attemptLng, jobAddress, jobLat, jobLng]);

  useEffect(() => {
    // Load Google Maps API if not already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Create script tag for Google Maps API - you'll need to set your API key here
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      initializeMap();
    };
    
    script.onerror = () => {
      setMapError(true);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [initializeMap]);

  if (mapError) {
    return (
      <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-slate-500">Unable to load map</p>
      </div>
    );
  }

  return (
    <div 
      id={`attempt-map-${attemptLat}-${attemptLng}`}
      className="h-32 w-full bg-slate-100 rounded-lg"
    />
  );
};

export default function AttemptWithMap({ attempt, jobId, jobAddress, jobCoordinates, employees, onEdit }) {
  const [showMap, setShowMap] = useState(false);

  const getServerName = () => {
    if (attempt.server_id) {
      const employee = employees.find(e => e.id === attempt.server_id);
      if (employee) {
        return `${employee.first_name} ${employee.last_name}`;
      }
    }
    return attempt.server_name_manual || 'Unknown Server';
  };

  const hasGpsData = attempt.gps_lat && attempt.gps_lon;
  const hasJobCoordinates = jobCoordinates?.latitude && jobCoordinates?.longitude;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${attempt.status === 'served' ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <CardTitle className="text-base">
                {format(new Date(attempt.attempt_date), 'PPP p')}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={attempt.status === 'served' ? 'default' : 'secondary'} className="text-xs">
                  {attempt.status === 'served' ? 'Served' : 'Not Served'}
                </Badge>
                <span className="text-sm text-slate-600">
                  {attempt.service_type_detail}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasGpsData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="gap-2"
              >
                {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showMap ? 'Hide Map' : 'Show Map'}
              </Button>
            )}
            <Link to={`${createPageUrl('LogAttempt')}?jobId=${jobId}&attemptId=${attempt.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Server Information */}
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Server:</span>
            <span className="font-medium">{getServerName()}</span>
          </div>

          {/* Address Information */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-600">Address:</span>
              <p className="font-medium">{attempt.address_of_attempt}</p>
            </div>
          </div>

          {/* GPS Coordinates */}
          {hasGpsData && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-green-500" />
              <span className="text-slate-600">GPS:</span>
              <span className="font-mono text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                {attempt.gps_lat.toFixed(6)}, {attempt.gps_lon.toFixed(6)}
              </span>
            </div>
          )}

          {/* Person Served (if applicable) */}
          {attempt.status === 'served' && attempt.person_served_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-green-500" />
              <span className="text-slate-600">Person Served:</span>
              <span className="font-medium text-green-700">{attempt.person_served_name}</span>
              {attempt.relationship_to_recipient && (
                <span className="text-slate-500">({attempt.relationship_to_recipient})</span>
              )}
            </div>
          )}

          {/* Notes */}
          {attempt.notes && (
            <div className="text-sm">
              <span className="text-slate-600">Notes:</span>
              <p className="mt-1 text-slate-700 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">
                {attempt.notes}
              </p>
            </div>
          )}

          {/* Interactive Map */}
          {hasGpsData && showMap && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Attempt Location</span>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Attempt</span>
                  </div>
                  {hasJobCoordinates && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Job Address</span>
                    </div>
                  )}
                </div>
              </div>
              <AttemptMap
                attemptLat={attempt.gps_lat}
                attemptLng={attempt.gps_lon}
                jobAddress={jobAddress}
                jobLat={hasJobCoordinates ? jobCoordinates.latitude : null}
                jobLng={hasJobCoordinates ? jobCoordinates.longitude : null}
              />
            </div>
          )}

          {/* Uploaded Files */}
          {attempt.uploaded_files && attempt.uploaded_files.length > 0 && (
            <div>
              <span className="text-sm text-slate-600">Attachments:</span>
              <div className="mt-1 space-y-1">
                {attempt.uploaded_files.map((file, index) => (
                  <a
                    key={index}
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline block"
                  >
                    {file.name || `Attachment ${index + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}