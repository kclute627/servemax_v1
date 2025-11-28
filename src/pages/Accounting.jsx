
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, X, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Select,
  SelectItem,
} from '@/components/ui/select';

import InvoicesTable from '../components/invoicing/InvoicesTable';
import PaymentsTable from '../components/accounting/PaymentsTable';
import AccountingStats from '../components/accounting/AccountingStats';
import RevenueChart from '../components/accounting/RevenueChart';
import InvoiceStatusChart from '../components/accounting/InvoiceStatusChart';
import ServerPayTable from '../components/accounting/ServerPayTable';
import ContractorPaymentsTable from '../components/accounting/ContractorPaymentsTable';
import { useGlobalData } from '../components/GlobalDataContext';

export default function AccountingPage() {
  const { invoices, payments, clients, employees, serverPayRecords, isLoading, refreshData } = useGlobalData();
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();

  // Invoice filters
  const [invoiceFilters, setInvoiceFilters] = useState({
    search: '',
    status: 'all',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });

  // Payment filters
  const [paymentFilters, setPaymentFilters] = useState({
    search: '',
    paymentMethod: 'all',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });

  // Server Pay filters
  const [serverPayFilters, setServerPayFilters] = useState({
    search: '',
    employee: 'all',
    status: 'all',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });

  // Read URL parameters and set filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const age = params.get('age');

    if (tab) {
      setActiveTab(tab);
    }

    // Set age filter for invoices if present
    if (age && tab === 'invoices') {
      setInvoiceFilters(prev => ({ ...prev, ageFilter: age }));
    }
  }, [location.search]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const ageFilter = params.get('age');

    let filtered = invoices;

    // Apply search filter
    if (invoiceFilters.search) {
      filtered = filtered.filter(invoice => {
        const client = clients.find(c => c.id === invoice.client_id);
        return (
          invoice.invoice_number?.toLowerCase().includes(invoiceFilters.search.toLowerCase()) ||
          client?.company_name.toLowerCase().includes(invoiceFilters.search.toLowerCase())
        );
      });
    }

    // Apply status filter
    if (invoiceFilters.status !== 'all') {
      filtered = filtered.filter(inv => inv.status?.toLowerCase() === invoiceFilters.status);
    }

    // Apply amount range filter
    if (invoiceFilters.amountMin) {
      filtered = filtered.filter(inv => (inv.total_amount || inv.total || 0) >= parseFloat(invoiceFilters.amountMin));
    }
    if (invoiceFilters.amountMax) {
      filtered = filtered.filter(inv => (inv.total_amount || inv.total || 0) <= parseFloat(invoiceFilters.amountMax));
    }

    // Apply date range filter
    if (invoiceFilters.dateFrom) {
      filtered = filtered.filter(inv => {
        const invoiceDate = new Date(inv.invoice_date || inv.created_at);
        return invoiceDate >= new Date(invoiceFilters.dateFrom);
      });
    }
    if (invoiceFilters.dateTo) {
      filtered = filtered.filter(inv => {
        const invoiceDate = new Date(inv.invoice_date || inv.created_at);
        return invoiceDate <= new Date(invoiceFilters.dateTo);
      });
    }

    // Apply age filter from URL (for aging breakdown clicks)
    if (ageFilter) {
      filtered = filtered.filter(inv =>
        inv.status?.toLowerCase() !== 'cancelled' &&
        ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
      );

      const now = new Date();
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
        const daysOld = Math.floor((now - invoiceDate) / (1000 * 60 * 60 * 24));

        if (ageFilter === '0-30') {
          return daysOld < 30;
        } else if (ageFilter === '30-60') {
          return daysOld >= 30 && daysOld < 60;
        } else if (ageFilter === '60+') {
          return daysOld >= 60;
        }
        return true;
      });
    }

    return filtered;
  }, [invoices, clients, invoiceFilters, location.search]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply search filter
    if (paymentFilters.search) {
      filtered = filtered.filter(payment => {
        const client = clients.find(c => c.id === payment.client_id);
        const invoice = invoices.find(i => i.id === payment.invoice_id);
        return (
          payment.transaction_id?.toLowerCase().includes(paymentFilters.search.toLowerCase()) ||
          client?.company_name.toLowerCase().includes(paymentFilters.search.toLowerCase()) ||
          invoice?.invoice_number.toLowerCase().includes(paymentFilters.search.toLowerCase())
        );
      });
    }

    // Apply payment method filter
    if (paymentFilters.paymentMethod !== 'all') {
      filtered = filtered.filter(p => p.payment_method?.toLowerCase() === paymentFilters.paymentMethod);
    }

    // Apply amount range filter
    if (paymentFilters.amountMin) {
      filtered = filtered.filter(p => (p.amount || 0) >= parseFloat(paymentFilters.amountMin));
    }
    if (paymentFilters.amountMax) {
      filtered = filtered.filter(p => (p.amount || 0) <= parseFloat(paymentFilters.amountMax));
    }

    // Apply date range filter
    if (paymentFilters.dateFrom) {
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at);
        return paymentDate >= new Date(paymentFilters.dateFrom);
      });
    }
    if (paymentFilters.dateTo) {
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at);
        return paymentDate <= new Date(paymentFilters.dateTo);
      });
    }

    return filtered;
  }, [payments, clients, invoices, paymentFilters]);

  // Filtered Server Pay
  const filteredServerPay = useMemo(() => {
    let filtered = serverPayRecords;

    // Apply search filter
    if (serverPayFilters.search) {
      filtered = filtered.filter(record => (
        record.job_number?.toLowerCase().includes(serverPayFilters.search.toLowerCase()) ||
        record.server_name?.toLowerCase().includes(serverPayFilters.search.toLowerCase())
      ));
    }

    // Apply employee filter
    if (serverPayFilters.employee !== 'all') {
      filtered = filtered.filter(r => r.server_id === serverPayFilters.employee);
    }

    // Apply status filter
    if (serverPayFilters.status !== 'all') {
      filtered = filtered.filter(r => r.status?.toLowerCase() === serverPayFilters.status);
    }

    // Apply amount range filter
    if (serverPayFilters.amountMin) {
      filtered = filtered.filter(r => (r.amount || 0) >= parseFloat(serverPayFilters.amountMin));
    }
    if (serverPayFilters.amountMax) {
      filtered = filtered.filter(r => (r.amount || 0) <= parseFloat(serverPayFilters.amountMax));
    }

    // Apply date range filter
    if (serverPayFilters.dateFrom) {
      filtered = filtered.filter(r => {
        const date = new Date(r.payment_date || r.created_at);
        return date >= new Date(serverPayFilters.dateFrom);
      });
    }
    if (serverPayFilters.dateTo) {
      filtered = filtered.filter(r => {
        const date = new Date(r.payment_date || r.created_at);
        return date <= new Date(serverPayFilters.dateTo);
      });
    }

    return filtered;
  }, [serverPayRecords, serverPayFilters]);

  const clearInvoiceFilters = () => {
    setInvoiceFilters({
      search: '',
      status: 'all',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
    window.history.pushState({}, '', window.location.pathname);
  };

  const clearPaymentFilters = () => {
    setPaymentFilters({
      search: '',
      paymentMethod: 'all',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const clearServerPayFilters = () => {
    setServerPayFilters({
      search: '',
      employee: 'all',
      status: 'all',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveInvoiceFilters = invoiceFilters.search || invoiceFilters.status !== 'all' ||
    invoiceFilters.amountMin || invoiceFilters.amountMax || invoiceFilters.dateFrom || invoiceFilters.dateTo;

  const hasActivePaymentFilters = paymentFilters.search || paymentFilters.paymentMethod !== 'all' ||
    paymentFilters.amountMin || paymentFilters.amountMax || paymentFilters.dateFrom || paymentFilters.dateTo;

  const hasActiveServerPayFilters = serverPayFilters.search || serverPayFilters.employee !== 'all' ||
    serverPayFilters.status !== 'all' || serverPayFilters.amountMin || serverPayFilters.amountMax ||
    serverPayFilters.dateFrom || serverPayFilters.dateTo;

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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-auto grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="server-pay">Server Pay</TabsTrigger>
              <TabsTrigger value="contractor-payments">Contractor Payments</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8 mt-6">
              <AccountingStats invoices={invoices} isLoading={isLoading} />

              {/* Invoice Aging + Invoice Status Chart Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoice Aging - 2/3 width */}
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Invoice Aging</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading aging data...</div>
                      ) : (() => {
                        const now = new Date();
                        const aging = {
                          under30: { amount: 0, count: 0 },
                          between30and60: { amount: 0, count: 0 },
                          over60: { amount: 0, count: 0 }
                        };

                        const outstandingInvoices = invoices.filter(inv =>
                          inv.status?.toLowerCase() !== 'cancelled' &&
                          ['issued', 'sent', 'overdue', 'partial', 'partially_paid'].includes(inv.status?.toLowerCase())
                        );

                        outstandingInvoices.forEach(inv => {
                          const invoiceDate = new Date(inv.invoice_date || inv.created_at);
                          const daysOld = Math.floor((now - invoiceDate) / (1000 * 60 * 60 * 24));
                          const amount = inv.balance_due || inv.amount_outstanding || inv.total_amount || inv.total || 0;

                          if (daysOld < 30) {
                            aging.under30.amount += amount;
                            aging.under30.count += 1;
                          } else if (daysOld < 60) {
                            aging.between30and60.amount += amount;
                            aging.between30and60.count += 1;
                          } else {
                            aging.over60.amount += amount;
                            aging.over60.count += 1;
                          }
                        });

                        const totalOutstanding = aging.under30.amount + aging.between30and60.amount + aging.over60.amount;
                        const totalCount = aging.under30.count + aging.between30and60.count + aging.over60.count;

                        return (
                          <div className="space-y-3">
                            <button
                              onClick={() => {
                                setActiveTab('invoices');
                                window.location.search = '?tab=invoices&age=0-30';
                              }}
                              className="w-full flex justify-between items-center p-4 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="font-medium text-slate-700 group-hover:text-slate-900">0-30 days</span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
                                  ${aging.under30.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-slate-500">{aging.under30.count} invoice{aging.under30.count !== 1 ? 's' : ''}</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setActiveTab('invoices');
                                window.location.search = '?tab=invoices&age=30-60';
                              }}
                              className="w-full flex justify-between items-center p-4 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span className="font-medium text-slate-700 group-hover:text-slate-900">30-60 days</span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
                                  ${aging.between30and60.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-slate-500">{aging.between30and60.count} invoice{aging.between30and60.count !== 1 ? 's' : ''}</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setActiveTab('invoices');
                                window.location.search = '?tab=invoices&age=60+';
                              }}
                              className="w-full flex justify-between items-center p-4 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="font-medium text-slate-700 group-hover:text-slate-900">60+ days</span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600">
                                  ${aging.over60.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-slate-500">{aging.over60.count} invoice{aging.over60.count !== 1 ? 's' : ''}</div>
                              </div>
                            </button>

                            <div className="pt-3 border-t border-slate-200">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Total Outstanding</span>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-slate-900">
                                    ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </div>
                                  <div className="text-xs text-slate-500">{totalCount} invoice{totalCount !== 1 ? 's' : ''}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Invoice Status Chart - 1/3 width */}
                <div className="lg:col-span-1">
                  <InvoiceStatusChart invoices={invoices} isLoading={isLoading} />
                </div>
              </div>

              {/* Revenue Chart - Full Width */}
              <RevenueChart invoices={invoices} isLoading={isLoading} />
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-6 mt-6">
              {/* Filter Controls */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Filters</h3>
                    {hasActiveInvoiceFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearInvoiceFilters}
                        className="ml-auto text-xs gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Search by invoice number or client..."
                          value={invoiceFilters.search}
                          onChange={(e) => setInvoiceFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <Select
                      value={invoiceFilters.status}
                      onChange={(e) => setInvoiceFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </Select>

                    {/* Date From */}
                    <Input
                      type="date"
                      placeholder="From Date"
                      value={invoiceFilters.dateFrom}
                      onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />

                    {/* Date To */}
                    <Input
                      type="date"
                      placeholder="To Date"
                      value={invoiceFilters.dateTo}
                      onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />

                    {/* Amount Min */}
                    <Input
                      type="number"
                      placeholder="Min Amount"
                      value={invoiceFilters.amountMin}
                      onChange={(e) => setInvoiceFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    />

                    {/* Amount Max */}
                    <Input
                      type="number"
                      placeholder="Max Amount"
                      value={invoiceFilters.amountMax}
                      onChange={(e) => setInvoiceFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                  {(invoiceFilters.search || hasActiveInvoiceFilters) && (
                    <div className="mt-4 text-sm text-slate-600">
                      Showing {filteredInvoices.length} of {invoices.length} invoices
                    </div>
                  )}
                </CardContent>
              </Card>

              <InvoicesTable
                invoices={filteredInvoices}
                clients={clients}
                isLoading={isLoading}
                onPaymentApplied={refreshData}
              />
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6 mt-6">
              {/* Filter Controls */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Filters</h3>
                    {hasActivePaymentFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearPaymentFilters}
                        className="ml-auto text-xs gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Search by transaction ID, client, or invoice..."
                          value={paymentFilters.search}
                          onChange={(e) => setPaymentFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Payment Method */}
                    <Select
                      value={paymentFilters.paymentMethod}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    >
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                    </Select>

                    {/* Date From */}
                    <Input
                      type="date"
                      placeholder="From Date"
                      value={paymentFilters.dateFrom}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />

                    {/* Date To */}
                    <Input
                      type="date"
                      placeholder="To Date"
                      value={paymentFilters.dateTo}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />

                    {/* Amount Min */}
                    <Input
                      type="number"
                      placeholder="Min Amount"
                      value={paymentFilters.amountMin}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    />

                    {/* Amount Max */}
                    <Input
                      type="number"
                      placeholder="Max Amount"
                      value={paymentFilters.amountMax}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                  {(paymentFilters.search || hasActivePaymentFilters) && (
                    <div className="mt-4 text-sm text-slate-600">
                      Showing {filteredPayments.length} of {payments.length} payments
                    </div>
                  )}
                </CardContent>
              </Card>

              <PaymentsTable
                payments={filteredPayments}
                invoices={invoices}
                clients={clients}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Server Pay Tab */}
            <TabsContent value="server-pay" className="space-y-6 mt-6">
              {/* Filter Controls */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Filters</h3>
                    {hasActiveServerPayFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearServerPayFilters}
                        className="ml-auto text-xs gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Search by job number or server name..."
                          value={serverPayFilters.search}
                          onChange={(e) => setServerPayFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Employee */}
                    <Select
                      value={serverPayFilters.employee}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, employee: e.target.value }))}
                    >
                      <SelectItem value="all">All Servers</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </Select>

                    {/* Status */}
                    <Select
                      value={serverPayFilters.status}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </Select>

                    {/* Date From */}
                    <Input
                      type="date"
                      placeholder="From Date"
                      value={serverPayFilters.dateFrom}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />

                    {/* Date To */}
                    <Input
                      type="date"
                      placeholder="To Date"
                      value={serverPayFilters.dateTo}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />

                    {/* Amount Min */}
                    <Input
                      type="number"
                      placeholder="Min Amount"
                      value={serverPayFilters.amountMin}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    />

                    {/* Amount Max */}
                    <Input
                      type="number"
                      placeholder="Max Amount"
                      value={serverPayFilters.amountMax}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                  {(serverPayFilters.search || hasActiveServerPayFilters) && (
                    <div className="mt-4 text-sm text-slate-600">
                      Showing {filteredServerPay.length} of {serverPayRecords.length} records
                    </div>
                  )}
                </CardContent>
              </Card>

              <ServerPayTable
                serverPayRecords={filteredServerPay}
                employees={employees}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Contractor Payments Tab */}
            <TabsContent value="contractor-payments" className="space-y-6 mt-6">
              {/* Filter Controls - Same as Server Pay */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Filters</h3>
                    {hasActiveServerPayFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearServerPayFilters}
                        className="ml-auto text-xs gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          placeholder="Search by job number or contractor name..."
                          value={serverPayFilters.search}
                          onChange={(e) => setServerPayFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Employee */}
                    <Select
                      value={serverPayFilters.employee}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, employee: e.target.value }))}
                    >
                      <SelectItem value="all">All Contractors</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </Select>

                    {/* Status */}
                    <Select
                      value={serverPayFilters.status}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </Select>

                    {/* Date From */}
                    <Input
                      type="date"
                      placeholder="From Date"
                      value={serverPayFilters.dateFrom}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />

                    {/* Date To */}
                    <Input
                      type="date"
                      placeholder="To Date"
                      value={serverPayFilters.dateTo}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />

                    {/* Amount Min */}
                    <Input
                      type="number"
                      placeholder="Min Amount"
                      value={serverPayFilters.amountMin}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    />

                    {/* Amount Max */}
                    <Input
                      type="number"
                      placeholder="Max Amount"
                      value={serverPayFilters.amountMax}
                      onChange={(e) => setServerPayFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                  {(serverPayFilters.search || hasActiveServerPayFilters) && (
                    <div className="mt-4 text-sm text-slate-600">
                      Showing {filteredServerPay.length} of {serverPayRecords.length} records
                    </div>
                  )}
                </CardContent>
              </Card>

              <ContractorPaymentsTable
                serverPayRecords={filteredServerPay}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
