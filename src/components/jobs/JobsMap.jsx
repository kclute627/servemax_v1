
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Briefcase, User, Clock, Loader2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from 'date-fns';

// Fix for default Leaflet icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const statusConfig = {
  pending: { color: "border-slate-300", bg: "bg-slate-50" },
  assigned: { color: "border-blue-300", bg: "bg-blue-50" },
  in_progress: { color: "border-amber-300", bg: "bg-amber-50" },
  served: { color: "border-green-300", bg: "bg-green-50" },
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function JobsMap({ jobs, isLoading }) {
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mapCenter, setMapCenter] = useState([34.0522, -118.2437]); // Default to LA
  const [mapZoom, setMapZoom] = useState(10);
  const jobItemRefs = useRef({});

  const jobsWithCoords = useMemo(() =>
    jobs.filter(job => job.addresses?.[0]?.latitude && job.addresses?.[0]?.longitude),
    [jobs]
  );

  useEffect(() => {
    if (jobsWithCoords.length > 0) {
      const latitudes = jobsWithCoords.map(j => j.addresses[0].latitude);
      const longitudes = jobsWithCoords.map(j => j.addresses[0].longitude);
      const avgLat = latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length;
      const avgLng = longitudes.reduce((sum, lng) => sum + lng, 0) / longitudes.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [jobsWithCoords]);

  useEffect(() => {
    if (selectedJobId && jobItemRefs.current[selectedJobId]) {
      jobItemRefs.current[selectedJobId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedJobId]);

  const handleMarkerClick = (job) => {
    setSelectedJobId(job.id);
  };

  const handleJobCardClick = (job) => {
    setSelectedJobId(job.id);
    setMapCenter([job.addresses[0].latitude, job.addresses[0].longitude]);
    setMapZoom(14);
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
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{job.recipient.name}</p>
                  <p className="text-sm text-slate-600">{job.addresses[0].address1}</p>
                </div>
                <Badge className={statusConfig[job.status]?.bg || 'bg-slate-50'}>{job.status}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                <span>Job #{job.job_number}</span>
                {job.due_date && <span>Due: {formatDistanceToNow(new Date(job.due_date), { addSuffix: true })}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="w-2/3 h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} className="h-full w-full">
            <TileLayer
              attribution='&copy; Google'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0','mt1','mt2','mt3']}
            />
            <ChangeView center={mapCenter} zoom={mapZoom} />

            {jobsWithCoords.map(job => (
              <Marker
                key={job.id}
                position={[job.addresses[0].latitude, job.addresses[0].longitude]}
                eventHandlers={{ click: () => handleMarkerClick(job) }}
                opacity={selectedJobId === job.id ? 1 : 0.8}
              >
                <Popup>
                  <div className="w-64">
                    <p className="font-bold text-base mb-1">{job.recipient.name}</p>
                    <p className="text-slate-600 text-sm mb-2">{job.addresses[0].address1}</p>
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusConfig[job.status]?.bg || 'bg-slate-50'}>{job.status}</Badge>
                      <span className="text-sm text-slate-500">
                        Due: {job.due_date ? formatDistanceToNow(new Date(job.due_date), { addSuffix: true }) : 'N/A'}
                      </span>
                    </div>
                    <Link to={`${createPageUrl("JobDetails")}?id=${job.id}`}>
                      <Button size="sm" className="w-full gap-2">
                          View Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
