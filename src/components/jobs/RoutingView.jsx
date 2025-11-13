import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectItem,
} from '@/components/ui/select';
import {
  Route as RouteIcon,
  MapPin,
  Clock,
  Navigation,
  Loader2,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { loadGooglePlacesAPI } from '@/utils/googlePlaces';
import { format } from 'date-fns';

export default function RoutingView({ jobs, employees, clients, isLoading }) {
  console.log('[RoutingView] Component mounted/rendered', { jobCount: jobs?.length, isLoading });

  const [selectedServerId, setSelectedServerId] = useState('all');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const directionsRendererRef = useRef(null);

  // Filter jobs by selected server and only show jobs with coordinates
  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job =>
      job.addresses?.[0]?.latitude &&
      job.addresses?.[0]?.longitude
    );

    if (selectedServerId && selectedServerId !== 'all') {
      result = result.filter(job => job.assigned_server_id === selectedServerId);
    }

    return result;
  }, [jobs, selectedServerId]);

  // Get server name
  const getServerName = useCallback((serverId) => {
    if (!serverId || serverId === 'unassigned') return 'Unassigned';

    const employee = employees.find(e => e.id === serverId);
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }

    const contractor = clients.find(c => c.id === serverId);
    if (contractor) {
      return contractor.company_name;
    }

    return 'Unknown Server';
  }, [employees, clients]);

  // Get unique servers from jobs
  const servers = useMemo(() => {
    const serverMap = new Map();

    jobs.forEach(job => {
      const serverId = job.assigned_server_id;
      if (serverId && serverId !== 'unassigned' && !serverMap.has(serverId)) {
        serverMap.set(serverId, {
          id: serverId,
          name: getServerName(serverId),
          jobCount: jobs.filter(j => j.assigned_server_id === serverId).length
        });
      }
    });

    return Array.from(serverMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs, getServerName]);

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    console.log('[RoutingView] initializeMap called', {
      hasMapRef: !!mapRef.current,
      mapLoaded,
      mapRefElement: mapRef.current
    });

    if (!mapRef.current || mapLoaded) {
      console.log('[RoutingView] Skipping map initialization:', {
        reason: !mapRef.current ? 'mapRef.current is null' : 'mapLoaded is true'
      });
      return;
    }

    console.log('[RoutingView] Initializing map...');

    try {
      await loadGooglePlacesAPI();
      console.log('[RoutingView] Google Maps API loaded');

      if (!window.google || !window.google.maps) {
        console.error('[RoutingView] Google Maps API not available after loading');
        setError('Failed to load Google Maps');
        return;
      }

      console.log('[RoutingView] Creating map instance...');
      // Create the map centered in the US
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        zoom: 4,
        mapTypeId: 'roadmap'
      });

      console.log('[RoutingView] Map initialized successfully');
      setMapLoaded(true);
    } catch (err) {
      console.error('[RoutingView] Error initializing map:', err);
      setError(`Failed to initialize map: ${err.message}`);
    }
  }, [mapLoaded]);

  // Calculate and display route
  const calculateRoute = useCallback(async () => {
    console.log('[RoutingView] calculateRoute called', {
      hasMap: !!googleMapRef.current,
      jobCount: filteredJobs.length
    });

    if (!googleMapRef.current || filteredJobs.length === 0) {
      console.log('[RoutingView] Skipping route calculation - missing requirements');
      setRouteLoaded(false);
      setRouteInfo(null);
      return;
    }

    if (filteredJobs.length === 1) {
      // Single job - just center map on it
      const job = filteredJobs[0];
      googleMapRef.current.setCenter({
        lat: job.addresses[0].latitude,
        lng: job.addresses[0].longitude
      });
      googleMapRef.current.setZoom(14);

      // Add single marker
      new window.google.maps.Marker({
        position: {
          lat: job.addresses[0].latitude,
          lng: job.addresses[0].longitude
        },
        map: googleMapRef.current,
        label: '1',
        title: job.recipient?.name || 'Job'
      });

      setRouteInfo({
        totalDistance: 'N/A',
        totalDuration: 'N/A',
        stops: 1
      });
      setRouteLoaded(true);
      return;
    }

    try {
      setError(null);
      setRouteLoaded(false);

      // First job is origin, last is destination, rest are intermediates
      const originLat = filteredJobs[0].addresses[0].latitude;
      const originLng = filteredJobs[0].addresses[0].longitude;
      const destLat = filteredJobs[filteredJobs.length - 1].addresses[0].latitude;
      const destLng = filteredJobs[filteredJobs.length - 1].addresses[0].longitude;

      // Intermediates (jobs in between origin and destination)
      const intermediates = filteredJobs.slice(1, -1).map(job => ({
        location: {
          latLng: {
            latitude: job.addresses[0].latitude,
            longitude: job.addresses[0].longitude
          }
        }
      }));

      console.log('[RoutingView] Calling Routes API with', {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        intermediateCount: intermediates.length
      });

      // Call Routes API
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs'
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: originLng
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: destLat,
                longitude: destLng
              }
            }
          },
          intermediates: intermediates,
          travelMode: 'DRIVE',
          optimizeWaypointOrder: intermediates.length > 0,
          languageCode: 'en-US',
          units: 'IMPERIAL'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RoutingView] Routes API error:', errorText);
        throw new Error(`Routes API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[RoutingView] Routes API response:', data);

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = data.routes[0];

      // Clear previous route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      // Decode and render the polyline
      const encodedPolyline = route.polyline.encodedPolyline;
      const decodedPath = window.google.maps.geometry.encoding.decodePath(encodedPolyline);

      // Create and display the polyline
      const routePolyline = new window.google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: googleMapRef.current
      });

      // Store polyline for cleanup
      directionsRendererRef.current = routePolyline;

      // Add markers for each stop
      filteredJobs.forEach((job, index) => {
        new window.google.maps.Marker({
          position: {
            lat: job.addresses[0].latitude,
            lng: job.addresses[0].longitude
          },
          map: googleMapRef.current,
          label: String(index + 1),
          title: job.recipient?.name || 'Job'
        });
      });

      // Fit map to route bounds
      const bounds = new window.google.maps.LatLngBounds();
      decodedPath.forEach(point => bounds.extend(point));
      googleMapRef.current.fitBounds(bounds);

      // Parse distance and duration
      const distanceMeters = route.distanceMeters || 0;
      const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');

      // Convert to miles and hours/minutes
      const miles = (distanceMeters * 0.000621371).toFixed(1);
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);

      setRouteInfo({
        totalDistance: `${miles} miles`,
        totalDuration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        stops: filteredJobs.length,
        optimizedOrder: route.optimizedIntermediateWaypointIndex || []
      });

      setRouteLoaded(true);
      console.log('[RoutingView] Route rendered successfully');
    } catch (err) {
      console.error('Error calculating route:', err);
      setError('Error calculating route');
    }
  }, [filteredJobs]);

  // Initialize map on mount
  useEffect(() => {
    console.log('[RoutingView] Mount useEffect triggered');
    initializeMap();
  }, [initializeMap]);

  // Recalculate route when jobs or server changes
  useEffect(() => {
    console.log('[RoutingView] Route calculation useEffect triggered', { mapLoaded });
    if (mapLoaded) {
      calculateRoute();
    }
  }, [mapLoaded, calculateRoute]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with server selection */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <RouteIcon className="w-5 h-5" />
              Route Planning
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Optimize routes for your servers
            </p>
          </div>

          <div className="w-64">
            <Select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
            >
              <SelectItem value="all">All Servers</SelectItem>
              {servers.map(server => (
                <SelectItem key={server.id} value={server.id}>
                  {server.name} ({server.jobCount} jobs)
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Route Summary */}
        {routeInfo && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-600">Total Distance</p>
                    <p className="text-lg font-bold">{routeInfo.totalDistance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs text-slate-600">Estimated Time</p>
                    <p className="text-lg font-bold">{routeInfo.totalDuration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-slate-600">Total Stops</p>
                    <p className="text-lg font-bold">{routeInfo.stops}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Map and Job List */}
      <div className="flex h-[calc(100vh-28rem)]">
        {/* Job List Sidebar */}
        <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
          <div className="p-4">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No jobs to route</p>
                <p className="text-slate-500 text-sm mt-1">
                  {selectedServerId === 'all'
                    ? 'No jobs with addresses found'
                    : 'Selected server has no jobs with addresses'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Route Order ({filteredJobs.length} stops)
                </p>
                {filteredJobs.map((job, index) => (
                  <div
                    key={job.id}
                    className="p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {job.recipient?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {job.addresses[0].address1}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {job.addresses[0].city}, {job.addresses[0].state}
                        </p>
                        {job.due_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            Due: {format(new Date(job.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="w-2/3 relative">
          {/* Always render the map div so ref is available */}
          <div ref={mapRef} className="h-full w-full" />

          {/* Show overlays based on state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-slate-900 font-medium">{error}</p>
              </div>
            </div>
          )}

          {!mapLoaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
