
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, Briefcase, User, Clock, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from 'date-fns';
import { loadGooglePlacesAPI } from '@/utils/googlePlaces';

const statusConfig = {
  pending: { color: "border-slate-300", bg: "bg-slate-50", markerColor: "#94a3b8" },
  assigned: { color: "border-blue-300", bg: "bg-blue-50", markerColor: "#3b82f6" },
  in_progress: { color: "border-amber-300", bg: "bg-amber-50", markerColor: "#f59e0b" },
  served: { color: "border-green-300", bg: "bg-green-50", markerColor: "#10b981" },
  needs_affidavit: { color: "border-purple-300", bg: "bg-purple-50", markerColor: "#a855f7" },
  unable_to_serve: { color: "border-red-300", bg: "bg-red-50", markerColor: "#ef4444" },
};

export default function JobsMap({ jobs, isLoading }) {
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const infoWindowRef = useRef(null);
  const jobItemRefs = useRef({});

  // Helper function to check if job number is valid (not UUID or timestamp)
  const isValidJobNumber = (jobNumber) => {
    if (!jobNumber) return false;
    // Check if it's a UUID (contains hyphens) or timestamp (very long number)
    const isUUID = typeof jobNumber === 'string' && jobNumber.includes('-');
    const isTimestamp = typeof jobNumber === 'string' && jobNumber.length > 10 && !isNaN(jobNumber);
    return !isUUID && !isTimestamp;
  };

  const jobsWithCoords = useMemo(() =>
    jobs.filter(job => job.addresses?.[0]?.latitude && job.addresses?.[0]?.longitude),
    [jobs]
  );

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || mapLoaded) return;

    try {
      await loadGooglePlacesAPI();

      if (!window.google || !window.google.maps) {
        setMapError(true);
        return;
      }

      // Try to get user's current location
      let center = { lat: 41.8781, lng: -87.6298 }; // Default fallback to Chicago

      try {
        console.log('[JobsMap] Requesting user location...');

        // Request user's location with increased timeout and high accuracy
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
              console.error('[JobsMap] Geolocation error:', error.code, error.message);
              reject(error);
            },
            {
              enableHighAccuracy: true, // Use GPS if available
              timeout: 15000, // Increased to 15 seconds
              maximumAge: 300000 // Cache for 5 minutes
            }
          );
        });

        // Use user's location as center
        center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('[JobsMap] Successfully using user location as center:', center);
      } catch (geoError) {
        console.log('[JobsMap] Geolocation failed, using default center (Chicago). Error:', geoError?.message || geoError);
        console.log('[JobsMap] Using default center (Chicago):', center);
        // Keep the default Chicago center instead of falling back to job locations
      }

      // Create the map
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 8, // More zoomed out for better overview
        mapTypeId: 'roadmap',
        styles: [], // Can add custom styles here if desired
        // Add standard UI controls for easier navigation
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy' // Allow scrolling to zoom without Cmd/Ctrl key
      });

      // Create single info window for reuse
      infoWindowRef.current = new window.google.maps.InfoWindow();

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [jobsWithCoords, mapLoaded]);

  // Update markers when jobs change
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // Create markers for each job
    jobsWithCoords.forEach(job => {
      const position = {
        lat: job.addresses[0].latitude,
        lng: job.addresses[0].longitude
      };

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: job.recipient?.name || 'Job',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: statusConfig[job.status]?.markerColor || '#94a3b8',
          fillOpacity: selectedJobId === job.id ? 1 : 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        setSelectedJobId(job.id);

        // Create info window content
        const dueText = job.due_date ? formatDistanceToNow(new Date(job.due_date), { addSuffix: true }) : 'N/A';

        const content = `
          <div class="p-2" style="max-width: 250px;">
            <p class="font-bold text-base mb-1">${job.recipient?.name || 'Unknown'}</p>
            <p class="text-slate-600 text-sm mb-2">${job.addresses[0].address1}</p>
            <p class="text-sm text-slate-500 mb-3">Due: ${dueText}</p>
            <a href="${createPageUrl("JobDetails")}?id=${job.id}"
               class="inline-block w-full text-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              View Details →
            </a>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(googleMapRef.current, marker);
      });

      markersRef.current[job.id] = marker;
    });
  }, [jobsWithCoords, mapLoaded, selectedJobId]);

  // Initialize map when component mounts
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Update marker opacity when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([jobId, marker]) => {
      const job = jobsWithCoords.find(j => j.id === jobId);
      if (job) {
        marker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: selectedJobId === jobId ? 12 : 10,
          fillColor: statusConfig[job.status]?.markerColor || '#94a3b8',
          fillOpacity: selectedJobId === jobId ? 1 : 0.8,
          strokeColor: '#ffffff',
          strokeWeight: selectedJobId === jobId ? 3 : 2,
        });
      }
    });
  }, [selectedJobId, jobsWithCoords]);

  // Scroll to selected job in sidebar
  useEffect(() => {
    if (selectedJobId && jobItemRefs.current[selectedJobId]) {
      jobItemRefs.current[selectedJobId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedJobId]);

  const handleJobCardClick = (job) => {
    setSelectedJobId(job.id);
    if (googleMapRef.current && markersRef.current[job.id]) {
      googleMapRef.current.setCenter({
        lat: job.addresses[0].latitude,
        lng: job.addresses[0].longitude
      });
      googleMapRef.current.setZoom(14);

      // Trigger marker click to show info window
      window.google.maps.event.trigger(markersRef.current[job.id], 'click');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex h-[70vh] gap-6">
          <div className="w-1/3 space-y-4 pr-4 overflow-y-auto">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <div className="w-2/3 h-full rounded-lg overflow-hidden">
              <Skeleton className="h-full w-full" />
          </div>
      </div>
    );
  }

  if (jobsWithCoords.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Jobs to Display on Map</h3>
        <p className="text-slate-500">None of the jobs in the current filter have GPS coordinates.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-22rem)] flex">
      {/* Sidebar Job List */}
      <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
        <div className="space-y-3 p-4"> {/* Added padding here for visual consistency */}
          {jobsWithCoords.map(job => (
            <div
              key={job.id}
              ref={el => jobItemRefs.current[job.id] = el}
              onClick={() => handleJobCardClick(job)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedJobId === job.id 
                  ? 'bg-blue-50 border-blue-400 shadow-md' 
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className="font-bold text-slate-900">{job.recipient.name}</p>
                <p className="text-sm text-slate-600">{job.addresses[0].address1}</p>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                <span>
                  {isValidJobNumber(job.job_number) ? `Job #${job.job_number}` : 'Job'}
                </span>
                {job.due_date && <span>Due: {formatDistanceToNow(new Date(job.due_date), { addSuffix: true })}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="w-2/3 h-full relative">
        {/* Always render the map div so ref is available */}
        <div
          ref={mapRef}
          className="h-full w-full"
          style={{ minHeight: '400px' }}
        />

        {/* Show overlays based on state */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Failed to load map</p>
            </div>
          </div>
        )}

        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
