import React, { useState, useEffect } from 'react';
import { Attempt, Job } from '@/api/entities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format } from 'date-fns';

const attemptStatusOptions = [
  { value: "served", label: "Served" },
  { value: "not_served", label: "Not Served" },
  { value: "contact_made", label: "Contact Made" },
  { value: "vacant", label: "Vacant" },
  { value: "bad_address", label: "Bad Address" },
];

const serviceMethodOptions = [
  { value: "personal", label: "Personal Service" },
  { value: "substituted", label: "Substituted Service" },
  { value: "posted", label: "Posting" },
  { value: "certified_mail", label: "Certified Mail" },
];

export default function NewAttemptDialog({ open, onOpenChange, job, employees, onAttemptCreated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [serverId, setServerId] = useState('');
  const [attemptDate, setAttemptDate] = useState(new Date());
  const [attemptTime, setAttemptTime] = useState(format(new Date(), "HH:mm"));
  const [status, setStatus] = useState('not_served');
  const [serviceMethod, setServiceMethod] = useState('personal');
  const [notes, setNotes] = useState('');
  const [addressOfAttempt, setAddressOfAttempt] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (job) {
      // Set defaults when dialog opens or job changes
      setServerId(job.assigned_server_id || '');
      setAddressOfAttempt(job.addresses?.find(a => a.primary)?.address1 || job.addresses?.[0]?.address1 || '');
      setAttemptDate(new Date());
      setAttemptTime(format(new Date(), "HH:mm"));
      setStatus('not_served');
      setNotes('');
      setGpsCoords(null);
    }
  }, [job, open]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading } = position.coords;
        setGpsCoords({
          lat: latitude,
          lon: longitude,
          accuracy: accuracy,
          altitude: altitude,
          heading: heading,
          timestamp: new Date(position.timestamp).toISOString()
        });
        setIsGettingLocation(false);

        if (accuracy > 100) {
          alert(`Location captured, but accuracy is low (±${Math.round(accuracy)}m). Consider moving to a more open area for better GPS signal.`);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Unable to retrieve your location. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        alert(errorMessage);
        setIsGettingLocation(false);
      },
      options
    );
  };
  
  const handleSaveAttempt = async () => {
    setIsSubmitting(true);

    const [hours, minutes] = attemptTime.split(':');
    const finalAttemptDate = new Date(attemptDate);
    finalAttemptDate.setHours(parseInt(hours, 10));
    finalAttemptDate.setMinutes(parseInt(minutes, 10));

    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window)
      || (navigator.maxTouchPoints > 0);

    try {
      // Resolve server name for cross-company compatibility
      const selectedEmployee = employees.find(e => e.id === serverId);
      const serverNameManual = selectedEmployee
        ? `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim() || 'Unknown Server'
        : 'Unknown Server';

      const attemptData = {
        job_id: job.id,
        server_id: serverId,
        server_name_manual: serverNameManual,
        attempt_date: finalAttemptDate.toISOString(),
        address_of_attempt: addressOfAttempt,
        status: status,
        notes: notes,
        // Enhanced GPS data
        gps_lat: gpsCoords?.lat,
        gps_lon: gpsCoords?.lon,
        gps_accuracy: gpsCoords?.accuracy,
        gps_altitude: gpsCoords?.altitude,
        gps_heading: gpsCoords?.heading,
        gps_timestamp: gpsCoords?.timestamp,
        device_timestamp: new Date().toISOString(),
        // Device tracking
        mobile_app_attempt: isMobile,
        device_info: navigator.userAgent,
        // Success flag
        success: status === 'served',
      };

      // Create the attempt record
      const newAttempt = await Attempt.create(attemptData);

      // Update job's attempts array so syncCarbonCopyJobStatus can sync to partner companies
      const currentJob = await Job.findById(job.id);
      const attemptsArray = Array.isArray(currentJob.attempts) ? [...currentJob.attempts] : [];
      attemptsArray.push({
        id: newAttempt.id,
        attempt_date: attemptData.attempt_date,
        status: attemptData.status,
        server_id: attemptData.server_id,
        server_name_manual: attemptData.server_name_manual,
        address_of_attempt: attemptData.address_of_attempt,
        notes: attemptData.notes,
        gps_lat: attemptData.gps_lat,
        gps_lon: attemptData.gps_lon,
        gps_accuracy: attemptData.gps_accuracy,
        gps_altitude: attemptData.gps_altitude,
        gps_timestamp: attemptData.gps_timestamp,
        mobile_app_attempt: attemptData.mobile_app_attempt,
        success: attemptData.success,
        created_at: new Date().toISOString(),
      });

      // Build job update payload
      const jobUpdateData = { attempts: attemptsArray };

      if (status === 'served') {
        jobUpdateData.status = 'served';
        jobUpdateData.service_date = finalAttemptDate.toISOString();
        jobUpdateData.service_method = serviceMethod;
      } else if (job.status === 'pending' || job.status === 'assigned') {
        jobUpdateData.status = 'in_progress';
      }

      await Job.update(job.id, jobUpdateData);

      onAttemptCreated(); // This will trigger a reload on the details page
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("Error saving attempt:", error);
      alert("Failed to save attempt: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!job) return null;

  const fullAddressObjects = job.addresses || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log New Service Attempt</DialogTitle>
          <DialogDescription>
            Record the details of a service attempt for Job #{job.job_number}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="server">Process Server</Label>
              <Select id="server" value={serverId} onValueChange={setServerId}>
                <option value="">Select a server...</option>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="address">Address of Attempt</Label>
              <Select id="address" value={addressOfAttempt} onValueChange={setAddressOfAttempt}>
                <option value="">Select an address...</option>
                {fullAddressObjects.map((addr, idx) => {
                    const fullAddr = `${addr.address1}, ${addr.city}, ${addr.state}`;
                    return (
                        <SelectItem key={idx} value={fullAddr}>
                            {fullAddr} {addr.primary && '(Primary)'}
                        </SelectItem>
                    );
                })}
              </Select>
            </div>
          </div>

          <div>
              <Label>Date & Time of Attempt</Label>
              <div className="flex items-center gap-2 mt-1">
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {attemptDate ? format(attemptDate, 'PPP') : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={attemptDate}
                              onSelect={setAttemptDate}
                              initialFocus
                          />
                      </PopoverContent>
                  </Popover>
                  <Input 
                    type="time" 
                    value={attemptTime}
                    onChange={(e) => setAttemptTime(e.target.value)}
                    className="w-[120px]"
                  />
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="status">Attempt Status</Label>
              <Select id="status" value={status} onValueChange={setStatus}>
                {attemptStatusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>
            </div>

            {status === 'served' && (
              <div>
                <Label htmlFor="service-method">Service Method</Label>
                <Select id="service-method" value={serviceMethod} onValueChange={setServiceMethod}>
                  {serviceMethodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="notes">Notes / Description of Service</Label>
            <Textarea 
              id="notes" 
              rows={4} 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what happened, who you spoke to, physical description of person served, etc."
            />
          </div>

          <div>
            <Label>Geolocation</Label>
            <div className="flex items-center gap-4 mt-1">
                <Button variant="outline" onClick={handleGetLocation} disabled={isGettingLocation} className="gap-2">
                    {isGettingLocation ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                        <MapPin className="w-4 h-4"/>
                    )}
                    Capture GPS Location
                </Button>
                {gpsCoords && (
                    <div className="text-sm text-green-700">
                        <p>Location captured: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lon.toFixed(4)}</p>
                        {gpsCoords.accuracy && (
                            <p className="text-xs text-slate-600">
                                Accuracy: ±{Math.round(gpsCoords.accuracy)}m
                                {gpsCoords.accuracy <= 20 && ' (Excellent)'}
                                {gpsCoords.accuracy > 20 && gpsCoords.accuracy <= 50 && ' (Good)'}
                                {gpsCoords.accuracy > 50 && gpsCoords.accuracy <= 100 && ' (Fair)'}
                                {gpsCoords.accuracy > 100 && ' (Low)'}
                            </p>
                        )}
                    </div>
                )}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveAttempt} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Attempt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}