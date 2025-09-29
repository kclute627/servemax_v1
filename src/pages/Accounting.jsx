
import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import InvoicesTable from '../components/invoicing/InvoicesTable';
import PaymentsTable from '../components/accounting/PaymentsTable';
import AccountingStats from '../components/accounting/AccountingStats';
import RevenueChart from '../components/accounting/RevenueChart';
import InvoiceStatusChart from '../components/accounting/InvoiceStatusChart';
import { useGlobalData } from '../components/GlobalDataContext'; // Import the custom hook

export default function AccountingPage() {
  // Use data from the global context instead of local state
  const { invoices, payments, clients, isLoading } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // No need for useEffect or loadData here anymore, as data is provided by context
  
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(invoice => {
        const client = clients.find(c => c.id === invoice.client_id);
        return (
            invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });
  }, [invoices, clients, searchTerm]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;
    return payments.filter(payment => {
        const client = clients.find(c => c.id === payment.client_id);
        const invoice = invoices.find(i => i.id === payment.invoice_id);
        return (
            payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice?.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });
  }, [payments, clients, invoices, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-screen mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Accounting</h1>
              <p className="text-slate-600">Your financial command center for invoicing and payments.</p>
            </div>
          </div>
          
          {/* Stats & Charts */}
          <AccountingStats invoices={invoices} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <RevenueChart invoices={invoices} isLoading={isLoading} />
            </div>
            <div>
                <InvoiceStatusChart invoices={invoices} isLoading={isLoading} />
            </div>
          </div>

          {/* Data Tables */}
          <Tabs defaultValue="invoices">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <TabsList className="grid w-full md:w-auto grid-cols-2">
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search invoices or payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
            </div>
            <TabsContent value="invoices">
                <InvoicesTable 
                    invoices={filteredInvoices}
                    clients={clients}
                    isLoading={isLoading}
                />
            </TabsContent>
            <TabsContent value="payments">
                <PaymentsTable
                    payments={filteredPayments}
                    invoices={invoices}
                    clients={clients}
                    isLoading={isLoading}
                />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
