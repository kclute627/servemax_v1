import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export default function InvoicePreview({
  invoice,
  client,
  job,
  companyInfo,
  className = '',
  isEditing = false,
  onSave,
  onCancel,
  isSaving = false,
  invoiceSettings,
  saveTrigger
}) {
  if (!invoice) return null;

  const [formData, setFormData] = useState({
    invoice_date: '',
    due_date: '',
    tax_rate: 0,
    line_items: []
  });

  useEffect(() => {
    if (invoice) {
      const normalizedLineItems = invoice.line_items && invoice.line_items.length > 0
        ? invoice.line_items.map(item => ({
            item_name: item.item_name || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            rate: item.rate || item.unit_price || 0,
            amount: item.amount || item.total || 0
          }))
        : [{ item_name: '', description: '', quantity: 1, rate: 0, amount: 0 }];

      setFormData({
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date || '',
        tax_rate: invoice.tax_rate || 0,
        line_items: normalizedLineItems
      });
    }
  }, [invoice]);

  useEffect(() => {
    if (saveTrigger > 0 && isEditing) {
      handleSubmit();
    }
  }, [saveTrigger, isEditing]);

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index][field] = value;

    // Auto-fill rate from presets
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
    if (formData.line_items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    const lineItems = isEditing ? formData.line_items : invoice.line_items;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || item.total || 0), 0);
    const taxRate = isEditing ? formData.tax_rate : (invoice.tax_rate || 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    if (onSave) {
      const savedLineItems = formData.line_items.map(item => ({
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        unit_price: item.rate,
        amount: item.amount,
        total: item.amount
      }));

      onSave({
        ...formData,
        line_items: savedLineItems,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        balance_due: total - (invoice.amount_paid || 0)
      });
    }
  };

  // Calculate totals based on current mode
  const lineItems = isEditing ? formData.line_items : invoice.line_items;
  const subtotal = lineItems?.reduce((sum, item) => sum + (item.amount || item.total || 0), 0) || 0;
  const taxRate = isEditing ? formData.tax_rate : (invoice.tax_rate || 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return (
    <div className={`invoice-preview bg-white ${className}`}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-preview, .invoice-preview * {
            visibility: visible;
          }
          .invoice-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5in;
          }
          @page {
            size: letter;
            margin: 0;
          }
          .page-break {
            page-break-after: always;
          }
          .no-print {
            display: none !important;
          }
        }

        .invoice-preview {
          max-width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 32px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          box-shadow: none;
        }

        .bill-to-section {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #e2e8f0;
        }

        .bill-to-section h3 {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 12px;
        }

        .bill-to-section p {
          font-size: 16px;
          color: #1e293b;
          margin: 4px 0;
          line-height: 1.6;
        }

        .bill-to-section p:first-child strong {
          font-size: 20px;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }

        .company-info h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .company-info p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }

        .invoice-meta {
          text-align: right;
        }

        .invoice-meta h2 {
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .invoice-meta p {
          font-size: 14px;
          color: #475569;
          margin-bottom: 4px;
        }

        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-bottom: 48px;
        }

        .detail-section h3 {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 12px;
        }

        .detail-section p {
          font-size: 14px;
          color: #1e293b;
          line-height: 1.6;
          margin-bottom: 4px;
        }

        .detail-section strong {
          font-weight: 600;
          color: #0f172a;
        }

        .line-items-table {
          width: 100%;
          margin-bottom: 32px;
          border-collapse: collapse;
        }

        .line-items-table thead {
          background-color: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .line-items-table th {
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .line-items-table th:last-child,
        .line-items-table td:last-child {
          text-align: right;
        }

        .line-items-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }

        .line-items-table td {
          padding: 16px 12px;
          font-size: 14px;
          color: #1e293b;
        }

        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 32px;
        }

        .totals-table {
          width: 300px;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .totals-row.total {
          border-top: 2px solid #e2e8f0;
          margin-top: 8px;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .totals-row.paid {
          color: #16a34a;
        }

        .totals-row.balance {
          font-size: 16px;
          font-weight: 600;
          color: #dc2626;
        }

        .invoice-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
        }

        .status-draft { background-color: #f1f5f9; color: #475569; }
        .status-sent { background-color: #dbeafe; color: #1e40af; }
        .status-paid { background-color: #dcfce7; color: #166534; }
        .status-overdue { background-color: #fee2e2; color: #991b1b; }
      `}</style>

      <div className="invoice-header">
        <div className="company-info">
          {companyInfo?.company_name && <h1>{companyInfo.company_name}</h1>}
          {(companyInfo?.address1 || companyInfo?.city) && (
            <p>
              {companyInfo.address1}<br />
              {companyInfo.address2 && <>{companyInfo.address2}<br /></>}
              {companyInfo.city}, {companyInfo.state} {companyInfo.zip}
            </p>
          )}
          {companyInfo?.phone && <p>Phone: {companyInfo.phone}</p>}
          {companyInfo?.email && <p>Email: {companyInfo.email}</p>}
        </div>

        <div className="invoice-meta">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
          <p><strong>Date:</strong> {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : 'N/A'}</p>
          <p><strong>Due:</strong> {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}</p>
          {job?.client_job_number && (
            <p><strong>Client Ref:</strong> {job.client_job_number}</p>
          )}
          {invoice.status && (
            <div>
              {invoice.status.toLowerCase() === 'issued' && invoice.issued_date ? (
                <p style={{ fontSize: '14px', color: '#1e40af', marginTop: '8px', fontWeight: '600' }}>
                  Issued: {format(new Date(invoice.issued_date), 'MMM dd, yyyy')}
                </p>
              ) : (
                <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
                  {invoice.status.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bill To Section */}
      <div className="bill-to-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {client ? (
          <>
            <div style={{ flex: 1 }}>
              <p><strong>{client.company_name}</strong></p>
              {(() => {
                // Find primary address or use first address from addresses array
                const primaryAddress = client.addresses?.find(addr => addr.primary) || client.addresses?.[0];
                if (primaryAddress) {
                  return (
                    <>
                      <p>{primaryAddress.address1}</p>
                      {primaryAddress.address2 && <p>{primaryAddress.address2}</p>}
                      <p>
                        {primaryAddress.city}, {primaryAddress.state}{' '}
                        {primaryAddress.postal_code}
                      </p>
                    </>
                  );
                }
                return null;
              })()}
            </div>
            {(() => {
              // Find the contact from client.contacts using job.contact_id
              const contact = client.contacts?.find(c => c.id === job?.contact_id);

              if (contact) {
                // Construct full name from first_name and last_name
                const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

                if (fullName) {
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <p><strong>Attn:</strong> {fullName}</p>
                      {contact.email && <p>{contact.email}</p>}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </>
        ) : (
          <p>Client information not available</p>
        )}
      </div>

      <table className="line-items-table">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Item</th>
            <th style={{ width: '40%' }}>Description</th>
            <th style={{ textAlign: 'center', width: '10%' }}>Quantity</th>
            <th style={{ textAlign: 'right', width: '15%' }}>Rate</th>
            <th style={{ width: '20%' }}>Amount</th>
            {isEditing && <th style={{ width: '50px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {lineItems && lineItems.length > 0 ? (
            lineItems.map((item, index) => {
              // Handle both naming conventions
              const itemName = item.item_name || '-';
              const description = item.description || '';
              const quantity = Number(item.quantity) || 1;
              const rate = Number(item.rate || item.unit_price || 0);
              const amount = Number(item.amount || item.total || 0);

              return (
                <tr key={index} className={isEditing ? 'editable-row' : ''}>
                  <td style={{ padding: isEditing ? '8px 6px' : '16px 12px' }}>
                    {isEditing ? (
                      // Check if item is not in presets or is "Custom" - show text input
                      item.item_name === 'Custom' || (item.item_name && !invoiceSettings?.invoice_presets?.some(p => p.description === item.item_name)) ? (
                        <input
                          type="text"
                          value={item.item_name === 'Custom' ? '' : item.item_name}
                          onChange={(e) => handleLineItemChange(index, 'item_name', e.target.value)}
                          placeholder="Enter custom item"
                          style={{
                            width: '100%',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '14px',
                            background: '#ffffff'
                          }}
                        />
                      ) : (
                        <select
                          value={item.item_name || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleLineItemChange(index, 'item_name', value);
                          }}
                          style={{
                            width: '100%',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '14px',
                            background: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
{invoiceSettings?.invoice_presets?.map((preset, presetIndex) => (
  <option key={preset.id || `preset-${presetIndex}`} value={preset.description}>
    {preset.description}
  </option>
))}
                          <option value="Custom">Custom...</option>
                        </select>
                      )
                    ) : (
                      itemName
                    )}
                  </td>
                  <td style={{ padding: isEditing ? '8px 6px' : '16px 12px' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Service description"
                        style={{
                          width: '100%',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: '14px',
                          background: '#ffffff'
                        }}
                      />
                    ) : (
                      description
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: isEditing ? '8px 6px' : '16px 12px' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: '14px',
                          textAlign: 'center',
                          background: '#ffffff'
                        }}
                      />
                    ) : (
                      quantity
                    )}
                  </td>
                  <td style={{ textAlign: 'right', padding: isEditing ? '8px 6px' : '16px 12px' }}>
                    {isEditing ? (
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#64748b',
                          fontSize: '14px'
                        }}>
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '6px 8px 6px 24px',
                            fontSize: '14px',
                            textAlign: 'right',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    ) : (
                      `$${rate.toFixed(2)}`
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>${amount.toFixed(2)}</td>
                  {isEditing && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={formData.line_items.length === 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: formData.line_items.length === 1 ? 'not-allowed' : 'pointer',
                          color: formData.line_items.length === 1 ? '#cbd5e1' : '#ef4444',
                          padding: '4px',
                          opacity: formData.line_items.length === 1 ? 0.3 : 1
                        }}
                        title="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={isEditing ? "6" : "5"} style={{ textAlign: 'center', color: '#94a3b8' }}>
                No line items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isEditing && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={addLineItem}
            style={{
              background: 'transparent',
              border: '1px dashed #cbd5e1',
              borderRadius: '4px',
              padding: '8px 16px',
              color: '#64748b',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#94a3b8';
              e.target.style.color = '#475569';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.color = '#64748b';
            }}
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        </div>
      )}

      <div className="totals-section">
        <div className="totals-table">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {(taxAmount > 0 || isEditing) && (
            <div className="totals-row" style={{ alignItems: 'center' }}>
              <span>Tax{!isEditing && taxRate > 0 ? ` (${(taxRate * 100).toFixed(1)}%)` : ''}:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isEditing && (
                  <>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.tax_rate > 0 ? (formData.tax_rate * 100).toFixed(1) : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: (parseFloat(e.target.value) || 0) / 100 }))}
                      placeholder="0"
                      style={{
                        width: '60px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '14px',
                        textAlign: 'right',
                        background: '#ffffff'
                      }}
                    />
                    <span>%</span>
                  </>
                )}
                <span style={{ marginLeft: isEditing ? '12px' : '0' }}>${taxAmount.toFixed(2)}</span>
              </span>
            </div>
          )}
          <div className="totals-row total">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="totals-row paid">
              <span>Amount Paid:</span>
              <span>-${invoice.amount_paid.toFixed(2)}</span>
            </div>
          )}
          {invoice.balance_due !== undefined && invoice.balance_due > 0 && (
            <div className="totals-row balance">
              <span>Balance Due:</span>
              <span>${invoice.balance_due.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'center' }} className="no-print">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSaving ? 'Saving...' : 'Done Editing'}
          </Button>
        </div>
      )}

    </div>
  );
}
