import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

export default function InvoiceEditForm({ invoice, invoiceSettings, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    invoice_date: '',
    due_date: '',
    payment_terms: '',
    tax_rate: 0,
    notes: '',
    line_items: []
  });
  const [taxEnabled, setTaxEnabled] = useState(false);

  useEffect(() => {
    if (invoice) {
      // Normalize line items to preserve both item_name and description
      const normalizedLineItems = invoice.line_items && invoice.line_items.length > 0
        ? invoice.line_items.map(item => ({
            item_name: item.item_name || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            rate: item.rate || item.unit_price || 0,
            amount: item.amount || item.total || 0
          }))
        : [{ item_name: '', description: '', quantity: 1, rate: 0, amount: 0 }];

      const taxRate = invoice.tax_rate || 0;

      setFormData({
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date || '',
        payment_terms: invoice.payment_terms || 'Net 30',
        tax_rate: taxRate,
        notes: invoice.notes || '',
        line_items: normalizedLineItems
      });

      // Enable tax toggle if there's a tax rate
      setTaxEnabled(taxRate > 0);
    }
  }, [invoice]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index][field] = value;

    // If item_name changed and it's a preset, auto-fill the rate
    if (field === 'item_name' && value) {
      const preset = invoiceSettings?.invoice_presets?.find(p => p.description === value);
      if (preset) {
        newLineItems[index].rate = preset.default_amount;
        const quantity = parseFloat(newLineItems[index].quantity) || 1;
        newLineItems[index].amount = quantity * preset.default_amount;
      }
    }

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(newLineItems[index].quantity) || 0;
      const rate = parseFloat(newLineItems[index].rate) || 0;
      newLineItems[index].amount = quantity * rate;
    }

    setFormData(prev => ({ ...prev, line_items: newLineItems }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { item_name: '', description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length === 1) {
      // Don't allow removing the last item
      return;
    }
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate || 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { subtotal, taxAmount, total } = calculateTotals();

    // Convert line items to database format (preserve both rate/unit_price and amount/total)
    const savedLineItems = formData.line_items.map(item => ({
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      unit_price: item.rate, // For compatibility
      amount: item.amount,
      total: item.amount // For compatibility
    }));

    onSave({
      ...formData,
      line_items: savedLineItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      balance_due: total - (invoice.amount_paid || 0)
    });
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="invoice_date">Invoice Date</Label>
          <Input
            id="invoice_date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => handleInputChange('invoice_date', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="mb-3">
          <Label className="text-base font-semibold">Line Items</Label>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-slate-700 w-32">Item</th>
                <th className="text-left p-3 text-sm font-medium text-slate-700">Description</th>
                <th className="text-center p-3 text-sm font-medium text-slate-700 w-24">Qty</th>
                <th className="text-right p-3 text-sm font-medium text-slate-700 w-32">Rate</th>
                <th className="text-right p-3 text-sm font-medium text-slate-700 w-32">Amount</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {formData.line_items.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="p-2">
                    {/* Show dropdown with presets, or text input for custom items */}
                    {(!item.item_name || item.item_name === '') || (item.item_name && invoiceSettings?.invoice_presets?.some(p => p.description === item.item_name)) ? (
                      <select
                        value={item.item_name || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__CUSTOM__') {
                            // Switch to text input mode by setting a space (will be trimmed)
                            handleLineItemChange(index, 'item_name', ' ');
                          } else {
                            handleLineItemChange(index, 'item_name', value);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select Item...</option>
                        <option value="__CUSTOM__">Custom Item...</option>
                        {invoiceSettings?.invoice_presets?.map((preset) => (
                          <option key={preset.id} value={preset.description}>
                            {preset.description}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={item.item_name.trim()}
                        onChange={(e) => handleLineItemChange(index, 'item_name', e.target.value)}
                        placeholder="Enter custom item"
                        className="text-sm"
                        autoFocus
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="Service description"
                      className="text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      className="text-center"
                      required
                    />
                  </td>
                  <td className="p-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                        className="pl-7 text-right"
                        required
                      />
                    </div>
                  </td>
                  <td className="p-2 text-right font-medium">
                    ${item.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                      disabled={formData.line_items.length === 1}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Line Item Button */}
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10"
            onClick={addLineItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end mt-4">
          <div className="w-80 space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>

            {/* Tax Toggle */}
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <span className="text-slate-600">Add Tax</span>
              <Switch
                checked={taxEnabled}
                onCheckedChange={(checked) => {
                  setTaxEnabled(checked);
                  if (!checked) {
                    handleInputChange('tax_rate', 0);
                  }
                }}
              />
            </div>

            {taxEnabled && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Tax Rate:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={formData.tax_rate > 0 ? (formData.tax_rate * 100) : ''}
                    onChange={(e) => handleInputChange('tax_rate', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-20 h-8 text-right"
                    placeholder="0"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax Amount:</span>
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
