import React, { useState, useEffect } from "react";
import { Invoice, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Download
} from "lucide-react";

import InvoicesTable from "../components/invoicing/InvoicesTable";

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invoicesData, clientsData] = await Promise.all([
        Invoice.list("-invoice_date"),
        Client.list(),
      ]);
      
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 md:p-8">
        <div className="max-w-screen mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Invoicing</h1>
              <p className="text-slate-600">Manage all your invoices</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 gap-2"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </Button>
            </div>
          </div>

          {/* Invoices Table */}
          <InvoicesTable 
            invoices={invoices}
            clients={clients}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}