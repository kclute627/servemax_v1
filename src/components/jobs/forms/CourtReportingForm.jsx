import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Briefcase,
  Video,
  FileText,
  Gavel,
} from "lucide-react";
import {
  PROCEEDING_TYPES,
  PROCEEDING_TYPE_LABELS,
  DEPOSITION_TYPES,
  DEPOSITION_TYPE_LABELS,
  PERSONNEL_ROLES,
  PERSONNEL_ROLE_LABELS,
  PAY_TYPES,
  PAY_TYPE_LABELS,
  TURNAROUND_TYPES,
  TURNAROUND_TYPE_LABELS,
  DELIVERY_METHODS,
  DELIVERY_METHOD_LABELS,
  EMPTY_WITNESS,
  EMPTY_OPPOSING_COUNSEL,
  EMPTY_PERSONNEL,
} from "@/firebase/schemas";

/**
 * CourtReportingForm - Form fields specific to Court Reporting jobs
 * Used within CreateJob.jsx when job_type is 'court_reporting'
 */
export default function CourtReportingForm({
  formData,
  onChange,
  employees = [],
}) {
  // Helper to update nested form data
  const handleChange = (field, value) => {
    onChange(field, value);
  };

  // Helper for nested object updates
  const handleNestedChange = (parentField, field, value) => {
    onChange(parentField, {
      ...formData[parentField],
      [field]: value,
    });
  };

  // Array field handlers
  const addWitness = () => {
    onChange("witnesses", [...(formData.witnesses || []), { ...EMPTY_WITNESS }]);
  };

  const removeWitness = (index) => {
    const updated = [...formData.witnesses];
    updated.splice(index, 1);
    onChange("witnesses", updated.length > 0 ? updated : [{ ...EMPTY_WITNESS }]);
  };

  const updateWitness = (index, field, value) => {
    const updated = [...formData.witnesses];
    updated[index] = { ...updated[index], [field]: value };
    onChange("witnesses", updated);
  };

  const addOpposingCounsel = () => {
    onChange("opposing_counsel", [
      ...(formData.opposing_counsel || []),
      { ...EMPTY_OPPOSING_COUNSEL },
    ]);
  };

  const removeOpposingCounsel = (index) => {
    const updated = [...formData.opposing_counsel];
    updated.splice(index, 1);
    onChange("opposing_counsel", updated);
  };

  const updateOpposingCounsel = (index, field, value) => {
    const updated = [...formData.opposing_counsel];
    updated[index] = { ...updated[index], [field]: value };
    onChange("opposing_counsel", updated);
  };

  const addPersonnel = () => {
    onChange("assigned_personnel", [
      ...(formData.assigned_personnel || []),
      { ...EMPTY_PERSONNEL },
    ]);
  };

  const removePersonnel = (index) => {
    const updated = [...formData.assigned_personnel];
    updated.splice(index, 1);
    onChange("assigned_personnel", updated);
  };

  const updatePersonnel = (index, field, value) => {
    const updated = [...formData.assigned_personnel];
    updated[index] = { ...updated[index], [field]: value };
    onChange("assigned_personnel", updated);
  };

  return (
    <div className="space-y-6">
      {/* Case Information */}
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
              <Label htmlFor="case_number">Case Number</Label>
              <Input
                id="case_number"
                value={formData.case_number || ""}
                onChange={(e) => handleChange("case_number", e.target.value)}
                placeholder="e.g., 2024-CV-12345"
              />
            </div>
            <div>
              <Label htmlFor="case_name">Case Name</Label>
              <Input
                id="case_name"
                value={formData.case_name || ""}
                onChange={(e) => handleChange("case_name", e.target.value)}
                placeholder="e.g., Smith v. Jones"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="court_name">Court Name</Label>
              <Input
                id="court_name"
                value={formData.court_name || ""}
                onChange={(e) => handleChange("court_name", e.target.value)}
                placeholder="e.g., Los Angeles Superior Court"
              />
            </div>
            <div>
              <Label htmlFor="proceeding_type">Proceeding Type</Label>
              <select
                id="proceeding_type"
                value={formData.proceeding_type || PROCEEDING_TYPES.DEPOSITION}
                onChange={(e) => handleChange("proceeding_type", e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(PROCEEDING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposition Details */}
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
              <Label htmlFor="deposition_date">Date</Label>
              <Input
                id="deposition_date"
                type="date"
                value={formData.deposition_date || ""}
                onChange={(e) => handleChange("deposition_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deposition_time">Time</Label>
              <Input
                id="deposition_time"
                type="time"
                value={formData.deposition_time || ""}
                onChange={(e) => handleChange("deposition_time", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estimated_duration">Estimated Duration</Label>
              <Input
                id="estimated_duration"
                value={formData.estimated_duration || ""}
                onChange={(e) => handleChange("estimated_duration", e.target.value)}
                placeholder="e.g., 4 hours"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="deposition_type">Deposition Type</Label>
            <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-100 p-1 mt-1">
              {Object.entries(DEPOSITION_TYPE_LABELS).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={formData.deposition_type === value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleChange("deposition_type", value)}
                  className={
                    formData.deposition_type === value
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-slate-600 hover:bg-slate-200"
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Video Conference Link - only show for remote/hybrid */}
          {(formData.deposition_type === DEPOSITION_TYPES.REMOTE ||
            formData.deposition_type === DEPOSITION_TYPES.HYBRID) && (
            <div>
              <Label htmlFor="video_conference_link">Video Conference Link</Label>
              <Input
                id="video_conference_link"
                value={formData.video_conference_link || ""}
                onChange={(e) =>
                  handleChange("video_conference_link", e.target.value)
                }
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}

          {/* Location - for in-person/hybrid */}
          {(formData.deposition_type === DEPOSITION_TYPES.IN_PERSON ||
            formData.deposition_type === DEPOSITION_TYPES.HYBRID) && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="w-4 h-4" />
                Location
              </div>
              <div>
                <Label htmlFor="location_name">Location Name</Label>
                <Input
                  id="location_name"
                  value={formData.deposition_location?.name || ""}
                  onChange={(e) =>
                    handleNestedChange("deposition_location", "name", e.target.value)
                  }
                  placeholder="e.g., Law Offices of Smith & Jones"
                />
              </div>
              <div>
                <Label htmlFor="location_address">Street Address</Label>
                <Input
                  id="location_address"
                  value={formData.deposition_location?.address || ""}
                  onChange={(e) =>
                    handleNestedChange("deposition_location", "address", e.target.value)
                  }
                  placeholder="123 Main Street, Suite 100"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location_city">City</Label>
                  <Input
                    id="location_city"
                    value={formData.deposition_location?.city || ""}
                    onChange={(e) =>
                      handleNestedChange("deposition_location", "city", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location_state">State</Label>
                  <Input
                    id="location_state"
                    value={formData.deposition_location?.state || ""}
                    onChange={(e) =>
                      handleNestedChange("deposition_location", "state", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location_zip">ZIP</Label>
                  <Input
                    id="location_zip"
                    value={formData.deposition_location?.zip || ""}
                    onChange={(e) =>
                      handleNestedChange("deposition_location", "zip", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Witnesses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Witnesses
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWitness}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Witness
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.witnesses || [{ ...EMPTY_WITNESS }]).map((witness, index) => (
            <div
              key={index}
              className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Witness {index + 1}
                </span>
                {formData.witnesses?.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWitness(index)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={witness.name || ""}
                    onChange={(e) => updateWitness(index, "name", e.target.value)}
                    placeholder="Witness name"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={witness.role || ""}
                    onChange={(e) => updateWitness(index, "role", e.target.value)}
                    placeholder="e.g., Plaintiff, Expert"
                  />
                </div>
                <div>
                  <Label>Contact Info</Label>
                  <Input
                    value={witness.contact_info || ""}
                    onChange={(e) =>
                      updateWitness(index, "contact_info", e.target.value)
                    }
                    placeholder="Phone or email"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ordering Attorney */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Ordering Attorney
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ordering_attorney_name">Name</Label>
              <Input
                id="ordering_attorney_name"
                value={formData.ordering_attorney?.name || ""}
                onChange={(e) =>
                  handleNestedChange("ordering_attorney", "name", e.target.value)
                }
                placeholder="Attorney name"
              />
            </div>
            <div>
              <Label htmlFor="ordering_attorney_firm">Firm</Label>
              <Input
                id="ordering_attorney_firm"
                value={formData.ordering_attorney?.firm || ""}
                onChange={(e) =>
                  handleNestedChange("ordering_attorney", "firm", e.target.value)
                }
                placeholder="Law firm name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ordering_attorney_email">Email</Label>
              <Input
                id="ordering_attorney_email"
                type="email"
                value={formData.ordering_attorney?.email || ""}
                onChange={(e) =>
                  handleNestedChange("ordering_attorney", "email", e.target.value)
                }
                placeholder="email@lawfirm.com"
              />
            </div>
            <div>
              <Label htmlFor="ordering_attorney_phone">Phone</Label>
              <Input
                id="ordering_attorney_phone"
                value={formData.ordering_attorney?.phone || ""}
                onChange={(e) =>
                  handleNestedChange("ordering_attorney", "phone", e.target.value)
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opposing Counsel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Opposing Counsel
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOpposingCounsel}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Counsel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(formData.opposing_counsel || []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No opposing counsel added yet
            </p>
          ) : (
            <div className="space-y-4">
              {formData.opposing_counsel.map((counsel, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      Counsel {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOpposingCounsel(index)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={counsel.name || ""}
                        onChange={(e) =>
                          updateOpposingCounsel(index, "name", e.target.value)
                        }
                        placeholder="Attorney name"
                      />
                    </div>
                    <div>
                      <Label>Firm</Label>
                      <Input
                        value={counsel.firm || ""}
                        onChange={(e) =>
                          updateOpposingCounsel(index, "firm", e.target.value)
                        }
                        placeholder="Law firm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={counsel.email || ""}
                        onChange={(e) =>
                          updateOpposingCounsel(index, "email", e.target.value)
                        }
                        placeholder="email@firm.com"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={counsel.phone || ""}
                        onChange={(e) =>
                          updateOpposingCounsel(index, "phone", e.target.value)
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label>Representing</Label>
                      <Input
                        value={counsel.representing || ""}
                        onChange={(e) =>
                          updateOpposingCounsel(index, "representing", e.target.value)
                        }
                        placeholder="e.g., Defendant"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Personnel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Assigned Personnel
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPersonnel}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Personnel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(formData.assigned_personnel || []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No personnel assigned yet
            </p>
          ) : (
            <div className="space-y-4">
              {formData.assigned_personnel.map((person, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      Personnel {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePersonnel(index)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Employee</Label>
                      <select
                        value={person.employee_id || ""}
                        onChange={(e) =>
                          updatePersonnel(index, "employee_id", e.target.value)
                        }
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select employee...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name || emp.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <select
                        value={person.role || PERSONNEL_ROLES.COURT_REPORTER}
                        onChange={(e) =>
                          updatePersonnel(index, "role", e.target.value)
                        }
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {Object.entries(PERSONNEL_ROLE_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Pay Type</Label>
                      <select
                        value={person.pay_type || PAY_TYPES.FLAT}
                        onChange={(e) =>
                          updatePersonnel(index, "pay_type", e.target.value)
                        }
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {Object.entries(PAY_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Pay Rate ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={person.pay_rate || ""}
                        onChange={(e) =>
                          updatePersonnel(
                            index,
                            "pay_rate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Realtime Reporting</Label>
              <p className="text-sm text-slate-500">
                Live transcript feed during deposition
              </p>
            </div>
            <Switch
              checked={formData.realtime_needed || false}
              onCheckedChange={(checked) => handleChange("realtime_needed", checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Rough Draft</Label>
              <p className="text-sm text-slate-500">
                Provide rough draft same day
              </p>
            </div>
            <Switch
              checked={formData.rough_draft_needed || false}
              onCheckedChange={(checked) =>
                handleChange("rough_draft_needed", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="turnaround_type">Turnaround</Label>
              <select
                id="turnaround_type"
                value={formData.turnaround_type || TURNAROUND_TYPES.STANDARD}
                onChange={(e) => handleChange("turnaround_type", e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(TURNAROUND_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="delivery_method">Delivery Method</Label>
              <select
                id="delivery_method"
                value={formData.delivery_method || DELIVERY_METHODS.EMAIL}
                onChange={(e) => handleChange("delivery_method", e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(DELIVERY_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="delivery_deadline">Delivery Deadline</Label>
            <Input
              id="delivery_deadline"
              type="date"
              value={formData.delivery_deadline || ""}
              onChange={(e) => handleChange("delivery_deadline", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority & Notes (shared fields rendered here for consistency) */}
      <Card>
        <CardHeader>
          <CardTitle>Priority & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={formData.priority || "standard"}
              onChange={(e) => handleChange("priority", e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="standard">Standard</option>
              <option value="rush">Rush</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={4}
              placeholder="Additional notes or special instructions..."
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
