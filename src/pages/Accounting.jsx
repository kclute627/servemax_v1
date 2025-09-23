
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore'; // FIREBASE TRANSITION: Import Firestore functions
import { db } from '@/lib/firebase'; // FIREBASE TRANSITION: Import Firestore database instance

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

// FIREBASE TRANSITION: Data display page.
export default function AccountingPage() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // FIREBASE TRANSITION: Replace Invoice.list(), Payment.list(), Client.list() with getDocs calls.
      const [invoicesSnapshot, paymentsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'clients')),
      ]);

      const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const paymentsData = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Note: Ordering like '-invoice_date' needs to be handled with Firestore queries (orderBy)
      // or client-side if not critical for initial load. For simplicity in this example,
      // we're fetching all and then filtering/sorting if needed for display.
      // E.g., const orderedInvoices = invoicesData.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));

      setInvoices(invoicesData);
      setPayments(paymentsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading accounting data:", error);
    }
    setIsLoading(false);
  };
  
  // The filteredInvoices and filteredPayments memos are frontend logic and will remain the same.
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

  // All sub-components are for display and will just receive data as props.
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
