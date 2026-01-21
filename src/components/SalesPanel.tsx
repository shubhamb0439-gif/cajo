import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AssemblyUnit {
  id: string;
  assembly_id: string;
  assembly_unit_number: number;
  assembly_serial_number: string;
  assembly_name: string;
}

interface SaleItem {
  assembly_unit_id: string;
  serial_number: string;
  assembly_name?: string;
}

interface Sale {
  id: string;
  sale_number: string;
  customer_id: string;
  sale_date: string;
  sale_notes: string | null;
  sale_items: SaleItem[];
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  customer_id: string;
  delivery_date: string | null;
  status: string;
  customers: {
    customer_name: string;
  };
}

interface SalesPanelProps {
  customerId: string;
  customerName: string;
  sale?: Sale | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalesPanel({ customerId, customerName, sale, onClose, onSuccess }: SalesPanelProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<AssemblyUnit[]>([]);
  const [hasPO, setHasPO] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    sale_notes: '',
    po_number: '',
  });
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    loadAvailableUnits();
    loadOpenPurchaseOrders();
    if (sale) {
      const saleWithPO = sale as any;
      setFormData({
        sale_date: sale.sale_date,
        sale_notes: sale.sale_notes || '',
        po_number: saleWithPO.po_number || '',
      });
      if (saleWithPO.po_number) {
        setHasPO(true);
      }
      setSaleItems(sale.sale_items || []);
    }
  }, [sale]);

  const loadAvailableUnits = async () => {
    const { data: units } = await supabase
      .from('assembly_units')
      .select(`
        id,
        assembly_id,
        assembly_unit_number,
        assembly_serial_number,
        assemblies(assembly_name)
      `)
      .not('assembly_serial_number', 'is', null);

    if (!units) return;

    const { data: soldUnits } = await supabase
      .from('sale_items')
      .select('assembly_unit_id');

    const soldIds = new Set((soldUnits || []).map(item => item.assembly_unit_id));

    const available = units
      .filter(unit => {
        if (sale) {
          const isInCurrentSale = sale.sale_items?.some(item => item.assembly_unit_id === unit.id);
          return !soldIds.has(unit.id) || isInCurrentSale;
        }
        return !soldIds.has(unit.id);
      })
      .map(unit => ({
        id: unit.id,
        assembly_id: unit.assembly_id,
        assembly_unit_number: unit.assembly_unit_number,
        assembly_serial_number: unit.assembly_serial_number,
        assembly_name: (unit.assemblies as any)?.assembly_name || 'Unknown',
      }));

    setAvailableUnits(available);
  };

  const loadOpenPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, customer_id, delivery_date, status, customers(customer_name)')
      .eq('status', 'open')
      .order('po_number', { ascending: false });
    if (data) setPurchaseOrders(data as PurchaseOrder[]);
  };

  const addSaleItem = () => {
    if (availableUnits.length === 0) {
      alert('No available assembled products with serial numbers');
      return;
    }
    setSaleItems([...saleItems, { assembly_unit_id: '', serial_number: '' }]);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateSaleItem = (index: number, unitId: string) => {
    const unit = availableUnits.find(u => u.id === unitId);
    if (!unit) return;

    const newItems = [...saleItems];
    newItems[index] = {
      assembly_unit_id: unitId,
      serial_number: unit.assembly_serial_number,
      assembly_name: unit.assembly_name,
    };
    setSaleItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saleItems.length === 0) {
      alert('Please add at least one product to the sale');
      return;
    }

    if (saleItems.some(item => !item.assembly_unit_id)) {
      alert('Please select a product for all sale items');
      return;
    }

    setLoading(true);
    try {
      if (sale) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            sale_date: formData.sale_date,
            sale_notes: formData.sale_notes || null,
            po_number: hasPO && formData.po_number.trim() ? formData.po_number.trim() : '',
            updated_by: userProfile?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sale.id);

        if (updateError) throw updateError;

        await supabase.from('sale_items').delete().eq('sale_id', sale.id);

        const itemsToInsert = saleItems.map(item => ({
          sale_id: sale.id,
          assembly_unit_id: item.assembly_unit_id,
          serial_number: item.serial_number,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id,
          action: 'UPDATE_SALE',
          details: {
            saleNumber: sale.sale_number,
            customerName,
            itemCount: saleItems.length,
          },
        });
      } else {
        const { data: saleNumberData } = await supabase.rpc('generate_sale_number');
        const saleNumber = saleNumberData || 'SALE-0001';

        const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert({
            sale_number: saleNumber,
            customer_id: customerId,
            sale_date: formData.sale_date,
            sale_notes: formData.sale_notes || null,
            po_number: hasPO && formData.po_number.trim() ? formData.po_number.trim() : '',
            created_by: userProfile?.id,
            updated_by: userProfile?.id,
          })
          .select()
          .single();

        if (saleError) throw saleError;

        const itemsToInsert = saleItems.map(item => ({
          sale_id: newSale.id,
          assembly_unit_id: item.assembly_unit_id,
          serial_number: item.serial_number,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id,
          action: 'CREATE_SALE',
          details: {
            saleNumber,
            customerName,
            itemCount: saleItems.length,
          },
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {sale ? 'Edit Sale' : 'New Sale'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">Customer</p>
          <p className="font-medium text-slate-900 dark:text-white">{customerName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sale Date
            </label>
            <input
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sale Notes
            </label>
            <textarea
              value={formData.sale_notes}
              onChange={(e) => setFormData({ ...formData, sale_notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPO}
                onChange={(e) => {
                  setHasPO(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({ ...formData, po_number: '' });
                  }
                }}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                This sale is for a Purchase Order
              </span>
            </label>
          </div>

          {hasPO && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Purchase Order *
              </label>
              <select
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              >
                <option value="">Select a Purchase Order</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.po_number}>
                    {po.po_number} - {(po.customers as any)?.customer_name || 'Unknown Customer'}
                    {po.delivery_date ? ` (Due: ${new Date(po.delivery_date).toLocaleDateString()})` : ''}
                  </option>
                ))}
              </select>
              {purchaseOrders.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No open purchase orders available
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Products
              </label>
              <button
                type="button"
                onClick={addSaleItem}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="space-y-2">
              {saleItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={item.assembly_unit_id}
                      onChange={(e) => updateSaleItem(index, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-sm"
                      required
                    >
                      <option value="">Select product...</option>
                      {availableUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.assembly_name} - SN: {unit.assembly_serial_number}
                        </option>
                      ))}
                    </select>
                    {item.serial_number && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Serial: {item.serial_number}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaleItem(index)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {saleItems.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No products added yet. Click "Add Product" to add items.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : sale ? 'Update Sale' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
