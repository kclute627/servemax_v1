import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon
} from "lucide-react";
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function ICLogAttempt() {
  const { jobId } = useParams();
  const { user, userData } = useOutletContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    status: 'attempted',
    attempt_date: format(new Date(), "yyyy-MM-dd"),
    attempt_time: format(new Date(), "HH:mm"),
    notes: '',
    // For served status
    person_served: {
      name: '',
      relationship: '',
      age: '',
      sex: '',
      height: '',
      weight: '',
      hair_color: ''
    }
  });

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    setIsLoading(true);
    try {
      const jobDoc = await getDoc(doc(db, "jobs", jobId));
      if (!jobDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Job not found"
        });
        navigate("/ic/jobs");
        return;
      }

      const jobData = { id: jobDoc.id, ...jobDoc.data() };

      // Verify this job is assigned to the current IC user
      if (jobData.assigned_server_id !== user.uid) {
        toast({
          variant: "destructive",
          title: "Access denied"
        });
        navigate("/ic/jobs");
        return;
      }

      setJob(jobData);
    } catch (error) {
      console.error("Error loading job:", error);
      toast({
        variant: "destructive",
        title: "Error loading job"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePersonServedChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      person_served: { ...prev.person_served, [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create the attempt record
      const attemptData = {
        job_id: jobId,
        company_id: job.company_id,
        server_id: user.uid,
        server_name: userData.full_name,
        status: formData.status,
        attempt_date: new Date(`${formData.attempt_date}T${formData.attempt_time}`).toISOString(),
        notes: formData.notes,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Add person served info if served
      if (formData.status === 'served') {
        attemptData.person_served = {
          name: formData.person_served.name,
          relationship: formData.person_served.relationship,
          age: formData.person_served.age,
          sex: formData.person_served.sex,
          height: formData.person_served.height,
          weight: formData.person_served.weight,
          hair_color: formData.person_served.hair_color
        };
      }

      await addDoc(collection(db, "attempts"), attemptData);

      // Update job status
      let newJobStatus = job.status;
      if (formData.status === 'served') {
        newJobStatus = 'served';
      } else if (formData.status === 'unable_to_serve') {
        newJobStatus = 'unable_to_serve';
      } else if (job.status === 'assigned' || job.status === 'pending') {
        newJobStatus = 'in_progress';
      }

      await updateDoc(doc(db, "jobs", jobId), {
        status: newJobStatus,
        service_date: formData.status === 'served' ? attemptData.attempt_date : null,
        updated_at: serverTimestamp()
      });

      toast({
        title: "Attempt Logged",
        description: formData.status === 'served'
          ? "Service completed successfully!"
          : "Attempt has been recorded."
      });

      navigate(`/ic/job/${jobId}`);
    } catch (error) {
      console.error("Error logging attempt:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log attempt. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ic/job/${jobId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Service Attempt</h1>
          <p className="text-slate-600 mt-1">
            Job #{job.job_number || job.id.slice(0, 8)} • {job.recipient_name}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attempt Details</CardTitle>
              <CardDescription>
                Record the outcome of your service attempt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="space-y-3">
                <Label>Attempt Result *</Label>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.status === 'attempted' ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value="attempted" />
                    <div>
                      <Clock className="w-5 h-5 text-blue-600 mb-1" />
                      <p className="font-medium">Attempted</p>
                      <p className="text-xs text-slate-500">Not home/unavailable</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.status === 'served' ? 'border-green-500 bg-green-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value="served" />
                    <div>
                      <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
                      <p className="font-medium">Served</p>
                      <p className="text-xs text-slate-500">Successfully served</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.status === 'unable_to_serve' ? 'border-red-500 bg-red-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value="unable_to_serve" />
                    <div>
                      <XCircle className="w-5 h-5 text-red-600 mb-1" />
                      <p className="font-medium">Unable to Serve</p>
                      <p className="text-xs text-slate-500">Could not complete</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Date and Time */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attempt_date">Date *</Label>
                  <Input
                    id="attempt_date"
                    type="date"
                    value={formData.attempt_date}
                    onChange={(e) => handleInputChange('attempt_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attempt_time">Time *</Label>
                  <Input
                    id="attempt_time"
                    type="time"
                    value={formData.attempt_time}
                    onChange={(e) => handleInputChange('attempt_time', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Person Served (only if served) */}
              {formData.status === 'served' && (
                <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                  <h3 className="font-medium flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Person Served Information
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="person_name">Name *</Label>
                      <Input
                        id="person_name"
                        placeholder="Full name of person served"
                        value={formData.person_served.name}
                        onChange={(e) => handlePersonServedChange('name', e.target.value)}
                        required={formData.status === 'served'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Input
                        id="relationship"
                        placeholder="e.g., Self, Spouse, Co-worker"
                        value={formData.person_served.relationship}
                        onChange={(e) => handlePersonServedChange('relationship', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        placeholder="Est. age"
                        value={formData.person_served.age}
                        onChange={(e) => handlePersonServedChange('age', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <Input
                        id="sex"
                        placeholder="M/F"
                        value={formData.person_served.sex}
                        onChange={(e) => handlePersonServedChange('sex', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        placeholder="e.g., 5'10"
                        value={formData.person_served.height}
                        onChange={(e) => handlePersonServedChange('height', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hair_color">Hair Color</Label>
                      <Input
                        id="hair_color"
                        placeholder="e.g., Brown"
                        value={formData.person_served.hair_color}
                        onChange={(e) => handlePersonServedChange('hair_color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional details about this attempt..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/ic/job/${jobId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Attempt
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
