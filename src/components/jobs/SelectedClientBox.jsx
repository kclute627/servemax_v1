import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, X, UserPlus } from "lucide-react";

export default function SelectedClientBox({
  client,
  contacts = [],
  selectedContactId,
  onContactChange,
  onRemoveClient,
  onAddContact
}) {
  const getClientTypeBadge = (type) => {
    const typeMap = {
      law_firm: "Law Firm",
      process_serving: "Process Serving",
      independent_contractor: "Independent Server"
    };
    return typeMap[type] || type;
  };

  const getClientLocation = () => {
    const primaryAddress = client.addresses?.find(addr => addr.primary) || client.addresses?.[0];
    if (primaryAddress) {
      return `${primaryAddress.city || ""}${primaryAddress.city && primaryAddress.state ? ", " : ""}${primaryAddress.state || ""}`.trim() || "No location";
    }
    return "No location";
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Client Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {client.company_name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    {getClientTypeBadge(client.company_type)}
                  </Badge>
                  <Badge variant="outline" className="text-slate-600">
                    📍 {getClientLocation()}
                  </Badge>
                  {client.status && (
                    <Badge
                      variant="outline"
                      className={client.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-600'}
                    >
                      {client.status === 'active' ? '✓ Active' : client.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemoveClient}
              className="text-slate-400 hover:text-slate-600 hover:bg-blue-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Contact Selection */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="contact_select" className="text-slate-700 font-medium mb-2">
                  Select Contact Person
                </Label>
                <select
                  id="contact_select"
                  value={selectedContactId}
                  onChange={(e) => onContactChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Choose a contact...</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.primary && " (Primary)"}
                      {contact.email && ` - ${contact.email}`}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onAddContact}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
