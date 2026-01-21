import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import SidePanel from '../SidePanel';
import type { Database } from '../../lib/database.types';

type BOM = Database['public']['Tables']['boms']['Row'] & {
  inventory_items: { item_id: string; item_name: string };
};

type BOMItem = Database['public']['Tables']['bom_items']['Row'] & {
  inventory_items: { id: string; item_id: string; item_name: string; item_stock_current: number };
};

interface VendorStock {
  vendor_id: string | null;
  vendor_name: string;
  source_type: string;
  stock_available: number | string;
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

interface Assembly {
  id: string;
  assembly_name: string;
  bom_id: string;
  assembly_quantity: number;
}

interface AssemblyFormProps {
  isOpen: boolean;
  assembly: Assembly | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssemblyForm({ isOpen, assembly, onClose, onSuccess }: AssemblyFormProps) {
  const { userProfile } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [form, setForm] = useState({ assembly_name: '', assembly_quantity: 1, bom_id: '', po_number: '' });
  const [hasPO, setHasPO] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [componentVendors, setComponentVendors] = useState<Record<string, string>>({});
  const [availableVendors, setAvailableVendors] = useState<Record<string, VendorStock[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBOMs();
      loadOpenPurchaseOrders();
      if (assembly) {
        setForm({
          assembly_name: assembly.assembly_name,
          assembly_quantity: assembly.assembly_quantity,
          bom_id: assembly.bom_id,
          po_number: ''
        });
        loadBOMForEdit(assembly.bom_id);
      } else {
        setForm({ assembly_name: '', assembly_quantity: 1, bom_id: '', po_number: '' });
        setHasPO(false);
        setSelectedBOM(null);
        setBomItems([]);
        setComponentVendors({});
        setAvailableVendors({});
      }
    }
  }, [isOpen, assembly]);

  useEffect(() => {
    if (selectedBOM && form.bom_id) {
      loadBOMItems(form.bom_id);
    }
  }, [selectedBOM, form.bom_id]);

  useEffect(() => {
    if (bomItems.length > 0) {
      loadVendorAvailability();
    }
  }, [bomItems, form.assembly_quantity]);

  const loadBOMs = async () => {
    const { data } = await supabase
      .from('boms')
      .select('*, inventory_items(item_id, item_name)')
      .order('bom_name');
    if (data) setBoms(data as BOM[]);
  };

  const loadOpenPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, customer_id, delivery_date, status, customers(customer_name)')
      .eq('status', 'open')
      .order('po_number', { ascending: false });
    if (data) setPurchaseOrders(data as PurchaseOrder[]);
  };

  const loadBOMForEdit = async (bomId: string) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) {
      const { data } = await supabase
        .from('boms')
        .select('*, inventory_items(item_id, item_name)')
        .eq('id', bomId)
        .maybeSingle();
      if (data) {
        setSelectedBOM(data as BOM);
      }
    } else {
      setSelectedBOM(bom);
    }
  };

  const loadBOMItems = async (bomId: string) => {
    const { data, error } = await supabase
      .from('bom_items')
      .select('*, inventory_items!bom_component_item_id(id, item_id, item_name, item_stock_current)')
      .eq('bom_id', bomId);

    if (error) {
      console.error('Error loading BOM items:', error);
      return;
    }

    if (data) {
      console.log('Loaded BOM items:', data);
      setBomItems(data as BOMItem[]);
      const initialVendors: Record<string, string> = {};
      data.forEach((item: BOMItem) => {
        initialVendors[item.id] = '';
      });
      setComponentVendors(initialVendors);
    }
  };

  const loadVendorAvailability = async () => {
    console.log('=== Starting loadVendorAvailability ===');
    console.log('BOM Items:', bomItems);
    console.log('Assembly Quantity:', form.assembly_quantity);

    const vendorAvailability: Record<string, VendorStock[]> = {};

    for (const item of bomItems) {
      const required = item.bom_component_quantity * form.assembly_quantity;

      console.log(`\n--- Loading vendors for ${item.inventory_items.item_name} ---`);
      console.log('BOM Item ID:', item.id);
      console.log('Inventory Item ID:', item.inventory_items.id);
      console.log('Required quantity:', required);
      console.log('Component quantity:', item.bom_component_quantity);

      const { data, error } = await supabase.rpc('get_item_stock_by_vendor', {
        p_item_id: item.inventory_items.id
      });

      if (error) {
        console.error(`Error loading vendors:`, error);
        vendorAvailability[item.id] = [];
      } else if (data) {
        console.log('Raw data from RPC:', data);
        console.log('Data length:', data.length);

        const availableVendorsForItem = data.filter((v: VendorStock) => {
          const stockNum = typeof v.stock_available === 'string'
            ? parseFloat(v.stock_available)
            : v.stock_available;
          const passes = stockNum >= required;
          console.log(`  ${v.vendor_name}: stock=${stockNum}, required=${required}, passes=${passes}`);
          return passes;
        });

        console.log(`Filtered count: ${availableVendorsForItem.length} of ${data.length}`);
        vendorAvailability[item.id] = availableVendorsForItem;
      } else {
        console.log('No data returned');
        vendorAvailability[item.id] = [];
      }
    }

    console.log('\n=== Final vendor availability ===');
    console.log(JSON.stringify(vendorAvailability, null, 2));
    setAvailableVendors(vendorAvailability);
  };

  const handleBOMChange = (bomId: string) => {
    const bom = boms.find(b => b.id === bomId);
    setSelectedBOM(bom || null);
    setForm({ ...form, bom_id: bomId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBOM) {
      setError('Please select a BOM');
      return;
    }

    if (assembly) {
      setError('Editing assemblies is not yet supported. Please delete and recreate.');
      return;
    }

    const missingVendors = bomItems.filter(item => !componentVendors[item.id]);
    if (missingVendors.length > 0) {
      setError('Please select a vendor for all components');
      return;
    }

    setLoading(true);

    try {
      const componentSources = bomItems.map(item => ({
        componentId: item.inventory_items.id,
        vendorId: componentVendors[item.id],
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assembly`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bomId: selectedBOM.id,
            assemblyName: form.assembly_name,
            quantity: form.assembly_quantity,
            userId: userProfile?.id,
            componentSources,
            poNumber: hasPO && form.po_number.trim() ? form.po_number.trim() : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create assembly');
      }

      alert('Assembly created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save assembly');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title={`${assembly ? 'Edit' : 'Create'} Assembly`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {!assembly && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select BOM *
            </label>
            <select
              value={form.bom_id}
              onChange={(e) => handleBOMChange(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Choose a BOM</option>
              {boms.map(bom => (
                <option key={bom.id} value={bom.id}>
                  {bom.bom_name} → {bom.inventory_items.item_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Assembly Name *
          </label>
          <input
            type="text"
            value={form.assembly_name}
            onChange={(e) => setForm({ ...form, assembly_name: e.target.value })}
            required
            placeholder="e.g., Batch #001"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          />
        </div>

        {!assembly && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={form.assembly_quantity}
              onChange={(e) => setForm({ ...form, assembly_quantity: parseFloat(e.target.value) })}
              required
              min="1"
              step="1"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        )}

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPO}
              onChange={(e) => {
                setHasPO(e.target.checked);
                if (!e.target.checked) {
                  setForm({ ...form, po_number: '' });
                }
              }}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              This assembly is for a Purchase Order
            </span>
          </label>
        </div>

        {hasPO && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Purchase Order *
            </label>
            <select
              value={form.po_number}
              onChange={(e) => setForm({ ...form, po_number: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
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

        {selectedBOM && bomItems.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 dark:text-white mb-3">Required Components & Vendor Sources</h3>
            <div className="space-y-3">
              {bomItems.map(item => {
                const required = item.bom_component_quantity * form.assembly_quantity;
                const available = item.inventory_items.item_stock_current;
                const vendorOptions = availableVendors[item.id] || [];
                const insufficient = vendorOptions.length === 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded ${
                      insufficient ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800' : 'bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.inventory_items.item_name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${insufficient ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          Need: {required} / Total: {available}
                        </span>
                        {insufficient && <AlertCircle className="w-4 h-4 text-red-600" />}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Vendor Source *
                      </label>
                      {insufficient ? (
                        <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
                          No vendors have adequate stock for this quantity
                        </div>
                      ) : (
                        <select
                          value={componentVendors[item.id] || ''}
                          onChange={(e) => setComponentVendors({ ...componentVendors, [item.id]: e.target.value })}
                          required
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                        >
                          <option value="">Select vendor source</option>
                          {vendorOptions.map((vendorStock, idx) => {
                            const stockNum = typeof vendorStock.stock_available === 'string'
                              ? parseFloat(vendorStock.stock_available)
                              : vendorStock.stock_available;
                            return (
                              <option
                                key={idx}
                                value={vendorStock.vendor_id || 'cajo-internal'}
                              >
                                {vendorStock.vendor_name} (Available: {stockNum})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-slate-400 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedBOM || bomItems.length === 0 || Object.values(availableVendors).some(v => v.length === 0)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? (assembly ? 'Updating...' : 'Creating...') : (assembly ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
