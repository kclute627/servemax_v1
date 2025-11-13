
import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Employee } from "@/api/entities";
import { Loader2, Edit, Plus, Trash2, DollarSign, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function EditEmployeeDialog({ open, onOpenChange, employee, onEmployeeUpdated }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "process_server",
    status: "active",
    phone: "",
    hire_date: "",
    license_number: "",
    server_pay_enabled: false
  });
  const [defaultPayItems, setDefaultPayItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        role: employee.role || "process_server",
        status: employee.status || "active",
        phone: employee.phone || "",
        hire_date: employee.hire_date || "",
        license_number: employee.license_number || "",
        server_pay_enabled: employee.server_pay_enabled || false
      });
      // Ensure existing rates are handled correctly for display if they are 0
      setDefaultPayItems(employee.default_pay_items ?
        employee.default_pay_items.map(item => ({
            ...item,
            rate: item.rate === 0 ? '' : item.rate, // Display 0 as empty string
            is_default: item.is_default || false // Initialize is_default
        })) : []
      );
    }
  }, [employee]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...defaultPayItems];
    if (field === 'rate') {
      // Handle rate as string initially, convert to number only if not empty
      newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setDefaultPayItems(newItems);
  };

  const addItem = () => {
    setDefaultPayItems([...defaultPayItems, { description: '', rate: '', is_default: false }]);
  };

  const toggleDefault = (index) => {
    const newItems = [...defaultPayItems];
    newItems[index].is_default = !newItems[index].is_default;
    setDefaultPayItems(newItems);
  };

  const removeItem = (index) => {
    setDefaultPayItems(defaultPayItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Prepare default_pay_items for submission: convert empty rates back to 0
      const itemsToSubmit = defaultPayItems.map(item => ({
        ...item,
        rate: item.rate === '' ? 0 : parseFloat(item.rate)
      }));

      await Employee.update(employee.id, {
        ...formData,
        default_pay_items: itemsToSubmit,
      });

      onEmployeeUpdated();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Employee
          </DialogTitle>
          <DialogDescription>
            Update details for {employee.first_name} {employee.last_name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4 pl-1">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={formData.first_name || ""} onChange={(e) => handleInputChange('first_name', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={formData.last_name || ""} onChange={(e) => handleInputChange('last_name', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pl-1">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ""} onChange={(e) => handleInputChange('email', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={formData.phone || ""} onChange={(e) => handleInputChange('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pl-1">
            <div>
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input id="hire_date" type="date" value={formData.hire_date || ""} onChange={(e) => handleInputChange('hire_date', e.target.value)} />
            </div>
            <div>
              {/* Empty column for symmetry */}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={formData.role || "process_server"}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <SelectItem value="office_staff">Office Staff</SelectItem>
                <SelectItem value="process_server">Process Server</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={formData.status || "active"}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </Select>
            </div>
          </div>

          {formData.role === 'process_server' && (
            <div>
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number || ""}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  placeholder="Process server license number"
                />
              </div>
            </div>
          )}

          {/* Server Pay Toggle */}
          <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="server_pay_enabled" className="text-base font-medium">Enable Server Pay</Label>
                <p className="text-sm text-slate-600 mt-1">Track commissions and pay for this employee</p>
              </div>
              <Switch
                id="server_pay_enabled"
                checked={!!formData.server_pay_enabled}
                onCheckedChange={(checked) => handleInputChange('server_pay_enabled', checked)}
              />
            </div>
          </div>

          {/* Default Server Pay Items - Show when enabled */}
          {formData.server_pay_enabled ? (
            <div className="space-y-4 rounded-lg border-2 border-slate-200 p-6 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Default Server Pay</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Pay Item
                </Button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Set commission rates for this employee. Mark items with a star to automatically add them when assigning jobs. You can have multiple default items.
              </p>

              <div className="space-y-3">
                {defaultPayItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No default pay items yet.</p>
                    <p className="text-sm">Click "Add Pay Item" to get started.</p>
                  </div>
                ) : (
                  defaultPayItems.map((item, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <Label className="text-xs font-medium text-slate-700 mb-1 block">Description</Label>
                        <Input
                          value={item.description || ""}
                          placeholder="e.g., Routine Service, Printing, Rush Fee"
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs font-medium text-slate-700 mb-1 block">Rate ($)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7 border-slate-300"
                            value={item.rate === '' ? '' : (item.rate || '')}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant={item.is_default ? "default" : "outline"}
                          size="icon"
                          onClick={() => toggleDefault(index)}
                          className={item.is_default ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-slate-500 hover:text-amber-500 hover:border-amber-500"}
                          title={item.is_default ? "Default item" : "Set as default"}
                        >
                          <Star className={`w-4 h-4 ${item.is_default ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {defaultPayItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <p className="text-sm text-slate-600">
                    <strong>Example usage:</strong> When assigning jobs to this employee, all items will be available as quick-add options. Items marked as default (with a star) will be automatically added to new job assignments.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border-2 border-dashed border-slate-200 p-6 bg-slate-50 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-600">
                  <DollarSign className="w-5 h-5" />
                  <h3 className="text-lg font-semibold text-slate-800">Default Server Pay</h3>
              </div>
              <p className="text-sm text-slate-500">Enable "Server Pay" above to configure commission rates for this employee.</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
