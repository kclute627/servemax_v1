
import React, { useState } from 'react';
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
import { Switch } from "@/components/ui/switch";
import { Employee } from "@/api/entities";
import { Loader2, UserPlus } from "lucide-react";

export default function NewEmployeeDialog({ open, onOpenChange, onEmployeeCreated }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "process_server",
    server_pay_enabled: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await Employee.create({
        ...formData,
        status: 'pending',
        hire_date: new Date().toISOString().split('T')[0]
      });
      
      onEmployeeCreated();
      // Reset form for next time
      setFormData({ 
        first_name: "", 
        last_name: "", 
        email: "", 
        role: "process_server",
        server_pay_enabled: false
      });
    } catch (error) {
      console.error("Error creating new employee:", error);
      alert("Failed to add new employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Employee
          </DialogTitle>
          <DialogDescription>
            Enter the employee's details. After adding, invite them from the main User Dashboard to grant access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => handleInputChange('first_name', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office_staff">Office Staff</SelectItem>
                <SelectItem value="process_server">Process Server</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Server Pay Toggle */}
          <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="server_pay_enabled" className="text-base font-medium">Enable Server Pay</Label>
                <p className="text-sm text-slate-600 mt-1">Track commissions and pay for this employee</p>
              </div>
              <Switch
                id="server_pay_enabled"
                checked={formData.server_pay_enabled}
                onCheckedChange={(checked) => handleInputChange('server_pay_enabled', checked)}
              />
            </div>
            <p className="text-xs text-slate-500">You can configure default pay rates after creating the employee.</p>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
