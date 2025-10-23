
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building, User as UserIcon, CreditCard, ListChecks, Receipt, Bot, DollarSign } from "lucide-react";
import { User } from "@/api/entities";
import { isSuperAdmin } from "@/utils/permissions";
import CompanySettingsPanel from "../components/settings/CompanySettingsPanel";
import UserSettingsPanel from "../components/settings/UserSettingsPanel";
import BillingPanel from "../components/settings/BillingPanel";
import ServiceSettingsPanel from "../components/settings/ServiceSettingsPanel";
import InvoiceSettingsPanel from "../components/settings/InvoiceSettingsPanel";
import AgentsSettingsPanel from "../components/settings/AgentsSettingsPanel";
import PricingConfigPanel from "../components/settings/PricingConfigPanel";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        // Set default tab based on user type after loading
        if (currentUser && isSuperAdmin(currentUser)) {
          setActiveTab('pricing');
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const TabButton = ({ tabName, label, icon: Icon }) => (
    <Button
      variant="ghost"
      onClick={() => setActiveTab(tabName)}
      className={`
        gap-2 px-6 py-3 rounded-lg transition-all duration-200 h-auto
        ${activeTab === tabName 
          ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );

  const isAdmin = user?.employee_role === 'admin';
  const isSuperAdminUser = user && isSuperAdmin(user);

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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
            <p className="text-slate-600">Manage company-wide configurations and your personal preferences.</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 mb-8">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 no-scrollbar">
                {!isSuperAdminUser && (
                  <>
                    <TabButton tabName="company" label="Company" icon={Building} />
                    <TabButton tabName="invoice" label="Invoice" icon={Receipt} />
                    <TabButton tabName="user" label="My Settings" icon={UserIcon} />
                    <TabButton tabName="service" label="Service" icon={ListChecks} />
                  </>
                )}
                {isAdmin && !isSuperAdminUser && (
                  <>
                    <TabButton tabName="agents" label="Agents" icon={Bot} />
                    <TabButton tabName="billing" label="Billing" icon={CreditCard} />
                  </>
                )}
                {isSuperAdminUser && (
                  <TabButton tabName="pricing" label="Pricing" icon={DollarSign} />
                )}
              </div>
          </div>

          {/* Content Area */}
          <div>
            {activeTab === 'company' && !isSuperAdminUser && <CompanySettingsPanel />}
            {activeTab === 'invoice' && !isSuperAdminUser && <InvoiceSettingsPanel />}
            {activeTab === 'user' && !isSuperAdminUser && <UserSettingsPanel />}
            {activeTab === 'service' && !isSuperAdminUser && <ServiceSettingsPanel />}
            {activeTab === 'agents' && isAdmin && !isSuperAdminUser && <AgentsSettingsPanel />}
            {activeTab === 'billing' && isAdmin && !isSuperAdminUser && <BillingPanel />}
            {activeTab === 'pricing' && isSuperAdminUser && <PricingConfigPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
