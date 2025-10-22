import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Receipt, ClipboardList, File } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/utils/permissions";
import { Navigate } from "react-router-dom";

// Template list components
import AffidavitTemplatesList from "../components/templates/AffidavitTemplatesList";
import InvoiceTemplatesList from "../components/templates/InvoiceTemplatesList";
import FieldSheetTemplatesList from "../components/templates/FieldSheetTemplatesList";
import BusinessFormsTemplatesList from "../components/templates/BusinessFormsTemplatesList";

export default function TemplatesManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('affidavits');

  // Only super admins can access this page
  if (!user || !isSuperAdmin(user)) {
    return <Navigate to="/Dashboard" replace />;
  }

  const TabButton = ({ tabName, label, icon: Icon }) => (
    <Button
      variant="ghost"
      onClick={() => setActiveTab(tabName)}
      className={`
        gap-2 px-6 py-3 rounded-lg transition-all duration-200 h-auto
        ${activeTab === tabName
          ? 'bg-purple-900 text-white shadow-sm hover:bg-purple-800'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="p-6 md:p-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Management</h1>
            <p className="text-slate-600">
              Manage system-wide templates for affidavits, invoices, field sheets, and business forms
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 no-scrollbar">
              <TabButton tabName="affidavits" label="Affidavits" icon={FileText} />
              <TabButton tabName="invoices" label="Invoices" icon={Receipt} />
              <TabButton tabName="fieldSheets" label="Field Sheets" icon={ClipboardList} />
              <TabButton tabName="businessForms" label="Business Forms" icon={File} />
            </div>
          </div>

          {/* Content Area */}
          <div>
            {activeTab === 'affidavits' && <AffidavitTemplatesList />}
            {activeTab === 'invoices' && <InvoiceTemplatesList />}
            {activeTab === 'fieldSheets' && <FieldSheetTemplatesList />}
            {activeTab === 'businessForms' && <BusinessFormsTemplatesList />}
          </div>
        </div>
      </div>
    </div>
  );
}
