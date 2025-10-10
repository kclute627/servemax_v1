import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, ChevronDown } from 'lucide-react';

export default function QuickInvoice({
  documents = [],
  priority = 'standard',
  invoiceSettings,
  onChange
}) {
  const [lineItems, setLineItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    description: '',
    quantity: 1,
    unit_price: ''
  });

  // Initialize with default fees
  useEffect(() => {
    const defaultItems = [];

    if (invoiceSettings) {
      // Add service fee
      if (invoiceSettings.service_fee > 0) {
        defaultItems.push({
          id: `item_${Date.now()}_1`,
          type: 'service_fee',
          item_name: 'Service Fee',
          description: '',
          quantity: 1,
          unit_price: invoiceSettings.service_fee,
          total: invoiceSettings.service_fee,
          is_editable: true,
          is_auto: false
        });
      }

      // Add rush/emergency fee based on priority
      if (priority === 'rush' && invoiceSettings.rush_fee > 0) {
        defaultItems.push({
          id: `item_${Date.now()}_2`,
          type: 'rush_fee',
          item_name: 'Rush Fee',
          description: '',
          quantity: 1,
          unit_price: invoiceSettings.rush_fee,
          total: invoiceSettings.rush_fee,
          is_editable: true,
          is_auto: false
        });
      } else if (priority === 'emergency' && invoiceSettings.emergency_fee > 0) {
        defaultItems.push({
          id: `item_${Date.now()}_3`,
          type: 'emergency_fee',
          item_name: 'Emergency Fee',
          description: '',
          quantity: 1,
          unit_price: invoiceSettings.emergency_fee,
          total: invoiceSettings.emergency_fee,
          is_editable: true,
          is_auto: false
        });
      }
    }

    // Always show at least one item to indicate users can add items
    if (defaultItems.length === 0) {
      defaultItems.push({
        id: `item_${Date.now()}_default`,
        type: 'service_fee',
        item_name: 'Service Fee',
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
        is_editable: true,
        is_auto: false
      });
    }

    setLineItems(defaultItems);
  }, [invoiceSettings]);

  // Auto-calculate copy charges when documents change
  useEffect(() => {
    if (!invoiceSettings?.invoice_for_printing) return;

    const totalPages = documents.reduce((sum, doc) => {
      return sum + (doc.page_count || 0);
    }, 0);

    if (totalPages > 0) {
      const copyChargeAmount = totalPages * invoiceSettings.per_page_copy_rate;

      setLineItems(prevItems => {
        // Remove existing copy charge
        const withoutCopyCharge = prevItems.filter(item => item.type !== 'copy_charge');

        // Add new copy charge
        return [
          ...withoutCopyCharge,
          {
            id: `copy_charge_${Date.now()}`,
            type: 'copy_charge',
            item_name: 'Copy Charges',
            description: `${totalPages} pages @ $${invoiceSettings.per_page_copy_rate}`,
            quantity: totalPages,
            unit_price: invoiceSettings.per_page_copy_rate,
            total: copyChargeAmount,
            is_editable: true,
            is_auto: true
          }
        ];
      });
    } else {
      // Remove copy charges if no documents
      setLineItems(prevItems => prevItems.filter(item => item.type !== 'copy_charge'));
    }
  }, [documents, invoiceSettings]);

  // Calculate totals
  useEffect(() => {
    const sub = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    setSubtotal(sub);

    let tax = 0;
    if (invoiceSettings?.tax_on_invoice && invoiceSettings?.tax_rate > 0) {
      tax = sub * (invoiceSettings.tax_rate / 100);
    }
    setTaxAmount(tax);

    setTotal(sub + tax);
  }, [lineItems, invoiceSettings]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange({
        line_items: lineItems,
        subtotal,
        tax_rate: invoiceSettings?.tax_on_invoice ? invoiceSettings.tax_rate : 0,
        tax_amount: taxAmount,
        total
      });
    }
  }, [lineItems, subtotal, taxAmount, total]);

  const handleItemNameChange = (itemId, newItemName) => {
    setLineItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, item_name: newItemName } : item
      )
    );
  };

  const handleDescriptionChange = (itemId, newDescription) => {
    setLineItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, description: newDescription } : item
      )
    );
  };

  const handleUnitPriceChange = (itemId, newUnitPrice) => {
    // Only allow numbers with max 2 decimal places
    const decimalRegex = /^\d*\.?\d{0,2}$/;

    // Allow empty string or valid decimal format
    if (newUnitPrice === '' || decimalRegex.test(newUnitPrice)) {
      setLineItems(prevItems =>
        prevItems.map(item => {
          if (item.id === itemId) {
            // Store raw value, calculate on blur or when valid number
            const unitPrice = newUnitPrice === '' ? '' : newUnitPrice;
            const quantity = parseFloat(item.quantity) || 1;
            const total = (parseFloat(unitPrice) || 0) * quantity;
            return { ...item, unit_price: unitPrice, total };
          }
          return item;
        })
      );
    }
  };

  const handleUnitPriceBlur = (itemId) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const unitPrice = parseFloat(item.unit_price) || 0;
          const quantity = parseFloat(item.quantity) || 1;
          const total = unitPrice * quantity;
          return { ...item, unit_price: unitPrice, total };
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          // Store raw value, calculate on blur or when valid number
          const quantity = newQuantity === '' ? '' : newQuantity;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const total = (parseFloat(quantity) || 0) * unitPrice;
          return { ...item, quantity, total };
        }
        return item;
      })
    );
  };

  const handleQuantityBlur = (itemId) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          // Allow empty or 0, don't force to 1
          const quantity = item.quantity === '' || item.quantity === null || item.quantity === undefined
            ? ''
            : (parseFloat(item.quantity) || 0);
          const unitPrice = parseFloat(item.unit_price) || 0;
          const total = (parseFloat(quantity) || 0) * unitPrice;
          return { ...item, quantity, total };
        }
        return item;
      })
    );
  };

  const handleTotalChange = (itemId, newTotal) => {
    setLineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const total = newTotal === '' ? 0 : parseFloat(newTotal) || 0;
          const quantity = item.quantity || 1;
          const unitPrice = total / quantity;
          return { ...item, total, unit_price: unitPrice };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId) => {
    setLineItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleAddPreset = (presetId) => {
    if (!invoiceSettings?.invoice_presets) return;

    const preset = invoiceSettings.invoice_presets.find(p => p.id === presetId);
    if (!preset) return;

    const newItem = {
      id: `preset_${Date.now()}_${Math.random()}`,
      type: 'preset',
      item_name: preset.description,
      description: '',
      quantity: 1,
      unit_price: preset.default_amount,
      total: preset.default_amount,
      is_editable: true,
      is_auto: false
    };

    setLineItems(prevItems => [...prevItems, newItem]);
  };

  const handleAddCustomItem = () => {
    if (!customItemForm.description) {
      alert('Please enter a description');
      return;
    }

    const quantity = parseFloat(customItemForm.quantity) || 1;
    const unitPrice = parseFloat(customItemForm.unit_price) || 0;
    const total = quantity * unitPrice;

    const newItem = {
      id: `custom_${Date.now()}_${Math.random()}`,
      type: 'custom',
      item_name: customItemForm.description,
      description: '',
      quantity,
      unit_price: unitPrice,
      total,
      is_editable: true,
      is_auto: false
    };

    setLineItems(prevItems => [...prevItems, newItem]);

    // Reset form
    setCustomItemForm({
      description: '',
      quantity: 1,
      unit_price: ''
    });
    setShowCustomItemForm(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-slate-900 mb-4">Quick Invoice</h3>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b-2 border-slate-300">
        <div className="col-span-2 text-xs font-semibold text-slate-600 uppercase">Item</div>
        <div className="col-span-5 text-xs font-semibold text-slate-600 uppercase">Description</div>
        <div className="col-span-2 text-xs font-semibold text-slate-600 uppercase text-right">Unit Price</div>
        <div className="col-span-1 text-xs font-semibold text-slate-600 uppercase text-right">Qty</div>
        <div className="col-span-1 text-xs font-semibold text-slate-600 uppercase text-right">Total</div>
        <div className="col-span-1"></div>
      </div>

      <div className="space-y-2">
        {lineItems.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 py-2 border-b border-slate-100 items-center">
            {/* Item Name - 2 columns */}
            <Input
              type="text"
              value={item.item_name || ''}
              onChange={(e) => handleItemNameChange(item.id, e.target.value)}
              placeholder="Item"
              className="col-span-2 h-8 text-sm"
            />
            {/* Description - 5 columns */}
            <Input
              type="text"
              value={item.description || ''}
              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
              placeholder="Description"
              className="col-span-5 h-8 text-sm"
            />
            {/* Unit Price - 2 columns with $ */}
            <div className="col-span-2 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-600">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={item.unit_price === '' || item.unit_price === null || item.unit_price === undefined ? '' :
                  (typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : item.unit_price)}
                onChange={(e) => handleUnitPriceChange(item.id, e.target.value.replace('$', ''))}
                onBlur={() => handleUnitPriceBlur(item.id)}
                placeholder="0.00"
                className="h-8 text-right text-sm pl-5"
              />
            </div>
            {/* Quantity - 1 column */}
            <Input
              type="text"
              inputMode="numeric"
              value={item.quantity === '' || item.quantity === null || item.quantity === undefined ? '' : String(item.quantity)}
              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
              onBlur={() => handleQuantityBlur(item.id)}
              placeholder=""
              className="col-span-1 h-8 text-right text-sm"
            />
            {/* Total - 1 column (read-only) */}
            <div className="col-span-1 h-8 flex items-center justify-end text-sm text-slate-700 font-medium">
              ${(item.total || 0).toFixed(2)}
            </div>
            {/* Delete button - 1 column */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-span-1 h-6 w-6 text-slate-400 hover:text-red-600 justify-self-center"
              onClick={() => handleRemoveItem(item.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Add Line Item Dropdown */}
        <div className="pt-2 relative">
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 justify-between"
            onClick={() => setShowPresetMenu(!showPresetMenu)}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>

          {showPresetMenu && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
              {/* Preset Items */}
              {invoiceSettings?.invoice_presets && invoiceSettings.invoice_presets.length > 0 ? (
                <>
                  {invoiceSettings.invoice_presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        handleAddPreset(preset.id);
                        setShowPresetMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-100 last:border-b-0"
                    >
                      <span className="text-sm text-slate-700">{preset.description}</span>
                      <span className="text-sm font-medium text-slate-900">
                        ${preset.default_amount.toFixed(2)}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-slate-200" />
                </>
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No presets configured. Add them in Settings → Invoice Settings.
                </div>
              )}

              {/* Custom Item */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomItemForm(true);
                  setShowPresetMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">Custom Line Item...</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom Item Form */}
        {showCustomItemForm && (
          <div className="flex items-end gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="custom-description" className="text-xs">Description</Label>
              <Input
                id="custom-description"
                value={customItemForm.description}
                onChange={(e) => setCustomItemForm({ ...customItemForm, description: e.target.value })}
                placeholder="e.g., Mileage Fee"
                className="h-8 text-sm"
              />
            </div>
            <div className="w-20">
              <Label htmlFor="custom-quantity" className="text-xs">Qty</Label>
              <Input
                id="custom-quantity"
                type="number"
                step="1"
                min="1"
                value={customItemForm.quantity}
                onChange={(e) => setCustomItemForm({ ...customItemForm, quantity: e.target.value })}
                className="h-8 text-sm text-right"
              />
            </div>
            <div className="w-24">
              <Label htmlFor="custom-unit-price" className="text-xs">Price</Label>
              <Input
                id="custom-unit-price"
                type="number"
                step="0.01"
                value={customItemForm.unit_price}
                onChange={(e) => setCustomItemForm({ ...customItemForm, unit_price: e.target.value })}
                placeholder="0.00"
                className="h-8 text-sm text-right"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomItem}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCustomItemForm(false);
                setCustomItemForm({ description: '', quantity: 1, unit_price: '' });
              }}
              className="h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2 pt-4 border-t-2 border-slate-300">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
          </div>

          {invoiceSettings?.tax_on_invoice && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Tax ({invoiceSettings?.tax_rate || 0}%)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={taxAmount.toFixed(2)}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-right text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between text-base font-semibold pt-2 border-t border-slate-300">
            <span className="text-slate-900">TOTAL</span>
            <span className="text-slate-900">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
