import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Briefcase,
  Video,
  FileText,
  Gavel,
  User,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import {
  PROCEEDING_TYPE_LABELS,
  DEPOSITION_TYPE_LABELS,
  PERSONNEL_ROLE_LABELS,
  PAY_TYPE_LABELS,
  TURNAROUND_TYPE_LABELS,
  DELIVERY_METHOD_LABELS,
  COURT_REPORTING_STATUS_LABELS,
} from "@/firebase/schemas";

/**
 * CourtReportingDetails - Display component for Court Reporting job details
 * Used in JobDetails.jsx when job.job_type is 'court_reporting'
 */
export default function CourtReportingDetails({ job, employees = [], onUploadDeliverables }) {
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "Not set";
    try {
      // Convert 24hr to 12hr format
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.email : "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Case Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            Case Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Case Number</Label>
              <p className="font-medium text-slate-900">{job?.case_number || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Case Name</Label>
              <p className="font-medium text-slate-900">{job?.case_name || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Court</Label>
              <p className="font-medium text-slate-900">{job?.court_name || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Proceeding Type</Label>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {PROCEEDING_TYPE_LABELS[job?.proceeding_type] || job?.proceeding_type || "—"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposition Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Deposition Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Date</Label>
              <p className="font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(job?.deposition_date)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Time</Label>
              <p className="font-medium text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {formatTime(job?.deposition_time)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Estimated Duration</Label>
              <p className="font-medium text-slate-900">{job?.estimated_duration || "—"}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">Deposition Type</Label>
            <Badge
              variant="outline"
              className={
                job?.deposition_type === "in_person"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : job?.deposition_type === "remote"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }
            >
              {DEPOSITION_TYPE_LABELS[job?.deposition_type] || job?.deposition_type || "—"}
            </Badge>
          </div>

          {/* Video Conference Link */}
          {(job?.deposition_type === "remote" || job?.deposition_type === "hybrid") &&
            job?.video_conference_link && (
              <div>
                <Label className="text-xs text-slate-500">Video Conference</Label>
                <a
                  href={job.video_conference_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Join Meeting
                </a>
              </div>
            )}

          {/* Location */}
          {(job?.deposition_type === "in_person" || job?.deposition_type === "hybrid") &&
            job?.deposition_location && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  Location
                </Label>
                {job.deposition_location.name && (
                  <p className="font-medium text-slate-900">{job.deposition_location.name}</p>
                )}
                <p className="text-slate-600">
                  {job.deposition_location.address}
                  <br />
                  {job.deposition_location.city}, {job.deposition_location.state}{" "}
                  {job.deposition_location.zip}
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Witnesses Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Witnesses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {job?.witnesses?.length > 0 ? (
            <div className="space-y-3">
              {job.witnesses.map((witness, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{witness.name || "—"}</p>
                    {witness.role && (
                      <p className="text-sm text-slate-500">Role: {witness.role}</p>
                    )}
                    {witness.contact_info && (
                      <p className="text-sm text-slate-500">{witness.contact_info}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No witnesses listed</p>
          )}
        </CardContent>
      </Card>

      {/* Attorneys Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Attorneys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ordering Attorney */}
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">Ordering Attorney</Label>
            {job?.ordering_attorney?.name ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-medium text-slate-900">{job.ordering_attorney.name}</p>
                {job.ordering_attorney.firm && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Building2 className="w-3 h-3" />
                    {job.ordering_attorney.firm}
                  </p>
                )}
                {job.ordering_attorney.email && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Mail className="w-3 h-3" />
                    {job.ordering_attorney.email}
                  </p>
                )}
                {job.ordering_attorney.phone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3" />
                    {job.ordering_attorney.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Not specified</p>
            )}
          </div>

          {/* Opposing Counsel */}
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">Opposing Counsel</Label>
            {job?.opposing_counsel?.length > 0 ? (
              <div className="space-y-3">
                {job.opposing_counsel.map((counsel, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <p className="font-medium text-slate-900">{counsel.name || "—"}</p>
                    {counsel.firm && (
                      <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                        <Building2 className="w-3 h-3" />
                        {counsel.firm}
                      </p>
                    )}
                    {counsel.representing && (
                      <p className="text-sm text-slate-500 mt-1">
                        Representing: {counsel.representing}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2">
                      {counsel.email && (
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {counsel.email}
                        </p>
                      )}
                      {counsel.phone && (
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {counsel.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No opposing counsel listed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Personnel Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Assigned Personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {job?.assigned_personnel?.length > 0 ? (
            <div className="space-y-3">
              {job.assigned_personnel.map((person, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {getEmployeeName(person.employee_id)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {PERSONNEL_ROLE_LABELS[person.role] || person.role}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">
                      ${person.pay_rate?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {PAY_TYPE_LABELS[person.pay_type] || person.pay_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No personnel assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Service Options Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {job?.realtime_needed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-medium text-slate-900">Realtime Reporting</p>
                <p className="text-xs text-slate-500">Live transcript feed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {job?.rough_draft_needed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-medium text-slate-900">Rough Draft</p>
                <p className="text-xs text-slate-500">Same day delivery</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Turnaround</Label>
              <p className="font-medium text-slate-900">
                {TURNAROUND_TYPE_LABELS[job?.turnaround_type] || job?.turnaround_type || "—"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Delivery Method</Label>
              <p className="font-medium text-slate-900">
                {DELIVERY_METHOD_LABELS[job?.delivery_method] || job?.delivery_method || "—"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Delivery Deadline</Label>
              <p className="font-medium text-slate-900">
                {formatDate(job?.delivery_deadline)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Deliverables
          </CardTitle>
          {onUploadDeliverables && (
            <Button variant="outline" size="sm" onClick={onUploadDeliverables} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {job?.deliverables && Object.values(job.deliverables).some((v) => v && (typeof v === 'string' ? v : v?.length > 0)) ? (
            <div className="space-y-3">
              {job.deliverables.transcript_pdf && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Transcript (PDF)</p>
                  </div>
                  <a
                    href={job.deliverables.transcript_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Download
                  </a>
                </div>
              )}
              {job.deliverables.video_files?.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Video className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      Video Files ({job.deliverables.video_files.length})
                    </p>
                  </div>
                </div>
              )}
              {job.deliverables.exhibits?.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      Exhibits ({job.deliverables.exhibits.length})
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              No deliverables uploaded yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {job?.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
