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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location.");
        setIsGettingLocation(false);
      }
    );
  };
  
  const handleSaveAttempt = async () => {
    setIsSubmitting(true);
    
    const [hours, minutes] = attemptTime.split(':');
    const finalAttemptDate = new Date(attemptDate);
    finalAttemptDate.setHours(parseInt(hours, 10));
    finalAttemptDate.setMinutes(parseInt(minutes, 10));

    try {
      const attemptData = {
        job_id: job.id,
        server_id: serverId,
        attempt_date: finalAttemptDate.toISOString(),
        address_of_attempt: addressOfAttempt,
        status: status,
        notes: notes,
        gps_lat: gpsCoords?.lat,
        gps_lon: gpsCoords?.lon,
      };

      // Create the attempt record
      await Attempt.create(attemptData);

      // If service was successful, update the parent job
      if (status === 'served') {
        const jobUpdateData = {
          status: 'served',
          service_date: finalAttemptDate.toISOString(),
          service_method: serviceMethod,
        };
        await Job.update(job.id, jobUpdateData);
      } else if (job.status === 'pending' || job.status === 'assigned') {
        // If an attempt is made, move job to "in progress"
        await Job.update(job.id, { status: 'in_progress' });
      }

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
                    <p className="text-sm text-green-700">
                        Location captured: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lon.toFixed(4)}
                    </p>
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