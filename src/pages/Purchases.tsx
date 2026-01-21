import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/dateUtils';
import { Search, Trash2, Filter, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Database } from '../lib/database.types';

interface PurchaseItem {
  id: string;
  item_id: string;
  vendor_item_code: string | null;
  quantity: number;
  unit_cost: number;
  lead_time: number;
  received: boolean;
  inventory_items: { id: string; item_id: string; item_name: string; item_stock_current: number };
}

interface Purchase {
  id: string;
  purchase_vendor_id: string | null;
  purchase_date: string;
  purchase_po_number: string | null;
  vendors: { vendor_name: string } | null;
  purchase_items: PurchaseItem[];
}

type FilterType = 'all' | 'purchases' | 'receipts';

export default function Purchases() {
  const location = useLocation();
  const { userProfile, hasWriteAccess } = useAuth();
  const { formatAmount, getCurrencySymbol, isViewOnly } = useCurrency();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filtered, setFiltered] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [vendors, setVendors] = useState<Database['public']['Tables']['vendors']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [showMakePurchase, setShowMakePurchase] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const state = location.state as { itemId?: string };
    if (state?.itemId) {
      setSelectedItemId(state.itemId);
      setShowMakePurchase(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    let result = purchases;
    if (search) {
      result = result.filter(p =>
        p.vendors?.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        p.purchase_po_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.purchase_items.some(item =>
          item.inventory_items.item_name.toLowerCase().includes(search.toLowerCase()) ||
          item.inventory_items.item_id.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    if (vendorFilter) {
      result = result.filter(p => p.purchase_vendor_id === vendorFilter);
    }
    if (statusFilter === 'purchases') {
      result = result.filter(p => p.purchase_items.some(item => !item.received));
    } else if (statusFilter === 'receipts') {
      result = result.filter(p => p.purchase_items.every(item => item.received));
    }
    setFiltered(result);
  }, [purchases, search, vendorFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    const [purchasesRes, vendorsRes] = await Promise.all([
      supabase
        .from('purchases')
        .select(`
          *,
          vendors(vendor_name),
          purchase_items(
            *,
            inventory_items(id, item_id, item_name, item_stock_current)
          )
        `)
        .order('purchase_date', { ascending: false }),
      supabase.from('vendors').select('*').order('vendor_name')
    ]);
    if (purchasesRes.data) setPurchases(purchasesRes.data as unknown as Purchase[]);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    setLoading(false);
  };

  const toggleExpand = (purchaseId: string) => {
    setExpandedPurchases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(purchaseId)) {
        newSet.delete(purchaseId);
      } else {
        newSet.add(purchaseId);
      }
      return newSet;
    });
  };

  const handleReceivedToggle = async (purchaseItem: PurchaseItem, purchase: Purchase) => {
    const newReceivedStatus = !purchaseItem.received;

    try {
      const quantityDiff = newReceivedStatus ? purchaseItem.quantity : -purchaseItem.quantity;

      await supabase
        .from('purchase_items')
        .update({
          received: newReceivedStatus,
          updated_by: userProfile?.id
        })
        .eq('id', purchaseItem.id);

      const { data: allReceivedItems } = await supabase
        .from('purchase_items')
        .select('quantity, unit_cost, lead_time, received')
        .eq('item_id', purchaseItem.item_id)
        .eq('received', true);

      let totalCost = 0;
      let totalLeadTimeWeighted = 0;
      let totalQty = 0;

      if (allReceivedItems) {
        allReceivedItems.forEach((item) => {
          totalCost += item.quantity * item.unit_cost;
          totalLeadTimeWeighted += item.quantity * item.lead_time;
          totalQty += item.quantity;
        });
      }

      const newStock = purchaseItem.inventory_items.item_stock_current + quantityDiff;
      const newAvgCost = totalQty > 0 ? totalCost / totalQty : 0;
      const newAvgLeadTime = totalQty > 0 ? totalLeadTimeWeighted / totalQty : 0;

      await supabase
        .from('inventory_items')
        .update({
          item_stock_current: newStock,
          item_cost_average: newAvgCost,
          item_lead_time_average: newAvgLeadTime,
          updated_by: userProfile?.id,
        })
        .eq('id', purchaseItem.inventory_items.id);

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: newReceivedStatus ? 'RECEIVE_PURCHASE_ITEM' : 'UNRECEIVE_PURCHASE_ITEM',
        details: {
          purchaseId: purchase.id,
          itemId: purchaseItem.inventory_items.item_id,
          itemName: purchaseItem.inventory_items.item_name,
          quantity: purchaseItem.quantity,
          unitCost: purchaseItem.unit_cost,
        },
      });

      loadData();
    } catch (error) {
      console.error('Error updating received status:', error);
      alert('Failed to update received status');
    }
  };

  const handleDelete = async (purchase: Purchase) => {
    const receivedItems = purchase.purchase_items.filter(item => item.received);

    if (receivedItems.length > 0) {
      if (!confirm(`This purchase has ${receivedItems.length} received item(s). Deleting will reduce stock. Continue?`)) {
        return;
      }
    }

    if (!confirm(`Delete purchase ${purchase.purchase_po_number || 'without PO number'}?`)) {
      return;
    }

    try {
      for (const item of receivedItems) {
        const newStock = item.inventory_items.item_stock_current - item.quantity;

        await supabase
          .from('inventory_items')
          .update({
            item_stock_current: newStock,
            updated_by: userProfile?.id,
          })
          .eq('id', item.inventory_items.id);
      }

      await supabase.from('purchases').delete().eq('id', purchase.id);

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'DELETE_PURCHASE',
        details: {
          poNumber: purchase.purchase_po_number,
          itemCount: purchase.purchase_items.length,
        },
      });

      loadData();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Failed to delete purchase');
    }
  };

  const calculateTotals = (items: PurchaseItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchases</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={() => {
              setSelectedItemId(null);
              setShowMakePurchase(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Make Purchase
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white appearance-none"
            >
              <option value="all">All</option>
              <option value="purchases">Purchases</option>
              <option value="receipts">Receipts</option>
            </select>
          </div>
          <div className="relative w-64">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white appearance-none"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-10"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleExpand(p.id)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        {expandedPurchases.has(p.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(p.purchase_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {p.purchase_po_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {p.vendors?.vendor_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {p.purchase_items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {getCurrencySymbol()}{formatAmount(calculateTotals(p.purchase_items))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.purchase_items.every(item => item.received) ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                          Received
                        </span>
                      ) : p.purchase_items.some(item => item.received) ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded">
                          Partial
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400 rounded">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {hasWriteAccess && !isViewOnly && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700"
                          title="Delete Purchase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedPurchases.has(p.id) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Purchase Items</h4>
                          <table className="w-full">
                            <thead>
                              <tr className="text-xs text-slate-500 dark:text-slate-400">
                                <th className="text-left pb-2">Item</th>
                                <th className="text-left pb-2">Vendor Code</th>
                                <th className="text-right pb-2">Quantity</th>
                                <th className="text-right pb-2">Unit Cost</th>
                                <th className="text-right pb-2">Total</th>
                                <th className="text-right pb-2">Lead Time</th>
                                <th className="text-center pb-2">Received</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {p.purchase_items.map(item => (
                                <tr key={item.id} className="text-sm">
                                  <td className="py-2 text-slate-900 dark:text-white">
                                    <div className="font-medium">{item.inventory_items.item_name}</div>
                                    <div className="text-xs text-slate-500">{item.inventory_items.item_id}</div>
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{item.vendor_item_code || '-'}</td>
                                  <td className="py-2 text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                                  <td className="py-2 text-right text-slate-700 dark:text-slate-300">{getCurrencySymbol()}{formatAmount(item.unit_cost)}</td>
                                  <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                                    {getCurrencySymbol()}{formatAmount(item.quantity * item.unit_cost)}
                                  </td>
                                  <td className="py-2 text-right text-slate-700 dark:text-slate-300">{item.lead_time} days</td>
                                  <td className="py-2 text-center">
                                    {hasWriteAccess && !isViewOnly ? (
                                      <input
                                        type="checkbox"
                                        checked={item.received}
                                        onChange={() => handleReceivedToggle(item, p)}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                      />
                                    ) : (
                                      item.received ? '✓' : '-'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12"><p className="text-slate-500">No purchases found</p></div>}
        </div>
      </div>

      {showMakePurchase && (
        <MakePurchasePanel
          initialItemId={selectedItemId}
          onClose={() => setShowMakePurchase(false)}
          onSuccess={() => {
            setShowMakePurchase(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface MakePurchasePanelProps {
  initialItemId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function MakePurchasePanel({ initialItemId, onClose, onSuccess }: MakePurchasePanelProps) {
  const { userProfile } = useAuth();
  const [vendors, setVendors] = useState<Database['public']['Tables']['vendors']['Row'][]>([]);
  const [items, setItems] = useState<Database['public']['Tables']['inventory_items']['Row'][]>([]);
  const [formData, setFormData] = useState({
    vendor_id: '',
    po_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [purchaseItems, setPurchaseItems] = useState<Array<{
    item_id: string;
    vendor_item_code: string;
    quantity: number;
    unit_cost: number;
    lead_time: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialItemId && items.length > 0) {
      setPurchaseItems([{
        item_id: initialItemId,
        vendor_item_code: '',
        quantity: 1,
        unit_cost: 0,
        lead_time: 0,
      }]);
    }
  }, [initialItemId, items]);

  const loadData = async () => {
    const [vendorsRes, itemsRes] = await Promise.all([
      supabase.from('vendors').select('*').order('vendor_name'),
      supabase.from('inventory_items').select('*').order('item_name')
    ]);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
  };

  const addItem = () => {
    setPurchaseItems([...purchaseItems, {
      item_id: '',
      vendor_item_code: '',
      quantity: 1,
      unit_cost: 0,
      lead_time: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPurchaseItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (purchaseItems.some(item => !item.item_id || item.quantity <= 0 || item.unit_cost < 0)) {
      alert('Please fill all item details correctly');
      return;
    }

    setLoading(true);

    try {
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_vendor_id: formData.vendor_id || null,
          purchase_po_number: formData.po_number || null,
          purchase_date: formData.purchase_date,
          created_by: userProfile?.id,
        })
        .select()
        .single();

      if (purchaseError || !purchase) throw purchaseError || new Error('Failed to create purchase');

      const itemsToInsert = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        item_id: item.item_id,
        vendor_item_code: item.vendor_item_code || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        lead_time: item.lead_time,
        received: false,
        created_by: userProfile?.id,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'CREATE_PURCHASE',
        details: {
          purchaseId: purchase.id,
          poNumber: formData.po_number,
          itemCount: purchaseItems.length,
        },
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert('Failed to create purchase');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Make Purchase</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vendor
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                PO Number
              </label>
              <input
                type="text"
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {purchaseItems.map((item, index) => (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Item *
                      </label>
                      <select
                        value={item.item_id}
                        onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Select Item</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.item_name} ({i.item_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Vendor Code
                      </label>
                      <input
                        type="text"
                        value={item.vendor_item_code}
                        onChange={(e) => updateItem(index, 'vendor_item_code', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        required
                        min="0.01"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Unit Cost *
                      </label>
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value))}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Lead Time
                        </label>
                        <input
                          type="number"
                          value={item.lead_time}
                          onChange={(e) => updateItem(index, 'lead_time', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {purchaseItems.length === 0 && (
                <p className="text-center text-slate-500 py-8">No items added yet</p>
              )}
            </div>
          </div>

          {purchaseItems.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Purchase Cost</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {getCurrencySymbol()}{formatAmount(calculateTotal())}
              </p>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
