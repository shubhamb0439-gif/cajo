import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDate } from '../lib/dateUtils';
import { Search, Plus, Pencil, Trash2, ShoppingCart, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../lib/database.types';
import SidePanel from '../components/SidePanel';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type DropdownValue = Database['public']['Tables']['dropdown_values']['Row'];

interface PurchaseItemHistory {
  id: string;
  quantity: number;
  unit_cost: number;
  lead_time: number;
  vendor_item_code: string | null;
  received: boolean;
  purchase_date: string;
  purchase_po_number: string | null;
  vendor_name: string | null;
}

interface AssemblyHistory {
  id: string;
  assembly_name: string;
  assembly_quantity: number;
  created_at: string;
  bom_name: string;
  created_by_name: string | null;
}

interface UsageHistory {
  id: string;
  assembly_name: string;
  quantity_used: number;
  created_at: string;
  bom_name: string;
  vendor_name: string | null;
  source_type: string | null;
}

interface SalesHistory {
  id: string;
  sale_number: string;
  customer_name: string;
  assembly_name: string;
  serial_number: string;
  quantity_sold: number;
  sale_date: string;
  delivered: boolean;
  delivered_at: string | null;
}

export default function Inventory() {
  const navigate = useNavigate();
  const { userProfile, hasWriteAccess } = useAuth();
  const { formatAmount, getCurrencySymbol, isViewOnly } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [itemPurchases, setItemPurchases] = useState<Record<string, PurchaseItemHistory[]>>({});
  const [itemAssemblies, setItemAssemblies] = useState<Record<string, AssemblyHistory[]>>({});
  const [itemUsages, setItemUsages] = useState<Record<string, UsageHistory[]>>({});
  const [itemSales, setItemSales] = useState<Record<string, SalesHistory[]>>({});

  useEffect(() => {
    loadData();

    const handleInventoryChange = () => {
      loadData();
    };

    const handleStockMovement = () => {
      loadData();
      setItemPurchases({});
      setItemAssemblies({});
      setItemUsages({});
      setItemSales({});
    };

    const handleDeliveryUpdate = () => {
      loadData();
      setItemSales({});
    };

    const subscription = supabase
      .channel('inventory_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, handleInventoryChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, handleStockMovement)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, handleDeliveryUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, handleDeliveryUpdate)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterGroup, filterClass]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, groupsRes, classesRes] = await Promise.all([
        supabase.from('inventory_items').select('*').order('item_name'),
        supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'item_group'),
        supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'item_class'),
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data.map(g => g.drop_value));
      if (classesRes.data) setClasses(classesRes.data.map(c => c.drop_value));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterGroup) {
      filtered = filtered.filter((item) => item.item_group === filterGroup);
    }

    if (filterClass) {
      filtered = filtered.filter((item) => item.item_class === filterClass);
    }

    setFilteredItems(filtered);
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete ${itemName}?`)) return;

    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'DELETE_ITEM',
        details: { itemName },
      });

      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const toggleRowExpansion = async (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);

      if (!itemPurchases[itemId]) {
        const { data } = await supabase
          .from('purchase_items')
          .select(`
            id,
            quantity,
            unit_cost,
            lead_time,
            vendor_item_code,
            received,
            purchases!inner(
              purchase_date,
              purchase_po_number,
              vendors!purchases_purchase_vendor_id_fkey(vendor_name)
            )
          `)
          .eq('item_id', itemId)
          .order('purchases(purchase_date)', { ascending: false });

        if (data) {
          const purchases: PurchaseItemHistory[] = data.map((p: any) => ({
            id: p.id,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
            lead_time: p.lead_time,
            vendor_item_code: p.vendor_item_code,
            received: p.received,
            purchase_date: p.purchases.purchase_date,
            purchase_po_number: p.purchases.purchase_po_number,
            vendor_name: p.purchases.vendors?.vendor_name || null,
          }));
          setItemPurchases(prev => ({ ...prev, [itemId]: purchases }));
        }
      }

      if (!itemAssemblies[itemId]) {
        const { data } = await supabase
          .from('assemblies')
          .select(`
            id,
            assembly_name,
            assembly_quantity,
            created_at,
            boms!inner(bom_name, bom_item_id),
            users!assemblies_created_by_fkey(name)
          `)
          .eq('boms.bom_item_id', itemId)
          .order('created_at', { ascending: false });

        if (data) {
          const assemblies: AssemblyHistory[] = data.map((a: any) => ({
            id: a.id,
            assembly_name: a.assembly_name,
            assembly_quantity: a.assembly_quantity,
            created_at: a.created_at,
            bom_name: a.boms.bom_name,
            created_by_name: a.users?.name || null,
          }));
          setItemAssemblies(prev => ({ ...prev, [itemId]: assemblies }));
        }
      }

      if (!itemUsages[itemId]) {
        const { data: bomItemsData } = await supabase
          .from('bom_items')
          .select('id, bom_id, bom_component_quantity')
          .eq('bom_component_item_id', itemId);

        if (bomItemsData && bomItemsData.length > 0) {
          const bomIds = bomItemsData.map(bi => bi.bom_id);

          const { data: assembliesData } = await supabase
            .from('assemblies')
            .select('id, assembly_name, assembly_quantity, created_at, bom_id, boms!inner(bom_name)')
            .in('bom_id', bomIds)
            .order('created_at', { ascending: false });

          if (assembliesData) {
            const usages: UsageHistory[] = [];

            for (const assembly of assembliesData) {
              const bomItem = bomItemsData.find(bi => bi.bom_id === assembly.bom_id);
              if (!bomItem) continue;

              const quantityUsed = bomItem.bom_component_quantity * assembly.assembly_quantity;

              const { data: assemblyItemData } = await supabase
                .from('assembly_items')
                .select('vendor_id, source_type, vendors(vendor_name)')
                .eq('assembly_id', assembly.id)
                .eq('assembly_component_item_id', itemId)
                .maybeSingle();

              usages.push({
                id: assembly.id,
                assembly_name: assembly.assembly_name,
                quantity_used: quantityUsed,
                created_at: assembly.created_at,
                bom_name: assembly.boms.bom_name,
                vendor_name: assemblyItemData?.vendors?.vendor_name || 'Cajo Technologies',
                source_type: assemblyItemData?.source_type || null,
              });
            }

            setItemUsages(prev => ({ ...prev, [itemId]: usages }));
          }
        } else {
          setItemUsages(prev => ({ ...prev, [itemId]: [] }));
        }
      }

      const { data: salesData } = await supabase
        .from('stock_movements')
        .select(`
          id,
          quantity_change,
          created_at,
          reference_id
        `)
        .eq('inventory_item_id', itemId)
        .eq('movement_type', 'sale')
        .order('created_at', { ascending: false });

      if (salesData && salesData.length > 0) {
        const saleIds = [...new Set(salesData.map(s => s.reference_id))];

        const { data: saleDetailsData } = await supabase
          .from('sales')
          .select(`
            id,
            sale_number,
            sale_date,
            customers(customer_name),
            sale_items(
              id,
              serial_number,
              delivered,
              assembly_units(
                assemblies(assembly_name)
              )
            ),
            deliveries(delivered_at)
          `)
          .in('id', saleIds);

        if (saleDetailsData) {
          const sales: SalesHistory[] = [];
          for (const sale of saleDetailsData) {
            const saleMovements = salesData.filter(sm => sm.reference_id === sale.id);
            for (const item of (sale.sale_items as any[])) {
              if (item.delivered) {
                sales.push({
                  id: sale.id,
                  sale_number: sale.sale_number,
                  customer_name: (sale.customers as any)?.customer_name || 'Unknown',
                  assembly_name: (item.assembly_units as any)?.assemblies?.assembly_name || 'Unknown',
                  serial_number: item.serial_number,
                  quantity_sold: Math.abs(saleMovements.reduce((sum, sm) => sum + Number(sm.quantity_change), 0)),
                  sale_date: sale.sale_date,
                  delivered: item.delivered,
                  delivered_at: (sale.deliveries as any[])?.[0]?.delivered_at || null,
                });
              }
            }
          }
          setItemSales(prev => ({ ...prev, [itemId]: sales }));
        }
      } else {
        setItemSales(prev => ({ ...prev, [itemId]: [] }));
      }
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventory Items</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={() => {
              setEditingItem(null);
              setShowItemForm(true);
            }}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Groups</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Item Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Avg Lead Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredItems.map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleRowExpansion(item.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {item.item_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_group || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_class || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-medium ${
                            item.item_stock_current < item.item_stock_min
                              ? 'text-red-600 dark:text-red-400'
                              : item.item_stock_current > item.item_stock_max
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.item_stock_current}
                        </span>
                        {(item.item_stock_current < item.item_stock_min || item.item_stock_current > item.item_stock_max) && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_stock_sold || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {getCurrencySymbol()}{formatAmount(item.item_cost_average)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.item_lead_time_average > 0 ? `${item.item_lead_time_average.toFixed(1)} days` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      {hasWriteAccess && !isViewOnly && (
                        <>
                          <button
                            onClick={() => navigate('/inventory/purchases', { state: { itemId: item.id } })}
                            className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Purchase"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemForm(true);
                            }}
                            className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.item_name)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={10} className="px-6 py-4 space-y-6">
                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Purchase History</div>
                          {itemPurchases[item.id] && itemPurchases[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Vendor</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Vendor Code</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Unit Cost</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Total</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Lead Time</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">PO #</th>
                                  <th className="text-center py-2 text-slate-600 dark:text-slate-400">Received</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemPurchases[item.id].map((purchase) => (
                                  <tr key={purchase.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {formatDate(purchase.purchase_date)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {purchase.vendor_name || '-'}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {purchase.vendor_item_code || '-'}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{purchase.quantity}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {getCurrencySymbol()}{formatAmount(purchase.unit_cost)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {getCurrencySymbol()}{formatAmount(purchase.quantity * purchase.unit_cost)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {purchase.lead_time > 0 ? `${purchase.lead_time} days` : '-'}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {purchase.purchase_po_number || '-'}
                                    </td>
                                    <td className="py-2 text-center">
                                      {purchase.received ? (
                                        <span className="text-green-600 dark:text-green-400">✓</span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No purchases yet</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Assembled History</div>
                          {itemAssemblies[item.id] && itemAssemblies[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Assembly Name</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">BOM</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Created By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemAssemblies[item.id].map((assembly) => (
                                  <tr key={assembly.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {formatDate(assembly.created_at)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{assembly.assembly_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{assembly.bom_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">+{assembly.assembly_quantity}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{assembly.created_by_name || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No assembly history</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Used History</div>
                          {itemUsages[item.id] && itemUsages[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Used In Assembly</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">BOM</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity Used</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemUsages[item.id].map((usage, idx) => (
                                  <tr key={`${usage.id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {formatDate(usage.created_at)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{usage.assembly_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{usage.bom_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">-{usage.quantity_used}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{usage.vendor_name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No usage history</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Delivered History</div>
                          {itemSales[item.id] && itemSales[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Delivery Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Sale #</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Customer</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Assembly</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Serial Number</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemSales[item.id].map((sale, idx) => (
                                  <tr key={`${sale.id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {sale.delivered_at ? formatDate(sale.delivered_at) : '-'}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.sale_number}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.customer_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.assembly_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.serial_number}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">-{sale.quantity_sold}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No delivery history</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No items found</p>
            </div>
          )}
        </div>
      </div>

      {showItemForm && (
        <ItemFormPanel
          item={editingItem}
          groups={groups}
          classes={classes}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowItemForm(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface ItemFormPanelProps {
  item: InventoryItem | null;
  groups: string[];
  classes: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function ItemFormPanel({ item, groups, classes, onClose, onSuccess }: ItemFormPanelProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    item_id: item?.item_id || '',
    item_name: item?.item_name || '',
    item_display_name: item?.item_display_name || '',
    item_unit: item?.item_unit || 'pcs',
    item_group: item?.item_group || '',
    item_class: item?.item_class || '',
    item_stock_min: item?.item_stock_min || 0,
    item_stock_max: item?.item_stock_max || 0,
    item_stock_reorder: item?.item_stock_reorder || 0,
    item_serial_number_tracked: item?.item_serial_number_tracked || false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (item) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ ...formData, updated_by: userProfile?.id })
          .eq('id', item.id);

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id,
          action: 'UPDATE_ITEM',
          details: { itemId: item.item_id, itemName: formData.item_name },
        });
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert({ ...formData, created_by: userProfile?.id });

        if (error) throw error;

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id,
          action: 'CREATE_ITEM',
          details: { itemId: formData.item_id, itemName: formData.item_name },
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel isOpen={true} onClose={onClose} title={item ? 'Edit Item' : 'Add Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Item Code *
            </label>
            <input
              type="text"
              value={formData.item_id}
              onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              required
              disabled={!!item}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.item_display_name}
              onChange={(e) => setFormData({ ...formData, item_display_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit *
            </label>
            <input
              type="text"
              value={formData.item_unit}
              onChange={(e) => setFormData({ ...formData, item_unit: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Group *
            </label>
            <select
              value={formData.item_group}
              onChange={(e) => setFormData({ ...formData, item_group: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select Group</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Class
            </label>
            <select
              value={formData.item_class}
              onChange={(e) => setFormData({ ...formData, item_class: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Stock
              </label>
              <input
                type="number"
                value={formData.item_stock_min}
                onChange={(e) => setFormData({ ...formData, item_stock_min: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Stock
              </label>
              <input
                type="number"
                value={formData.item_stock_max}
                onChange={(e) => setFormData({ ...formData, item_stock_max: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reorder
              </label>
              <input
                type="number"
                value={formData.item_stock_reorder}
                onChange={(e) => setFormData({ ...formData, item_stock_reorder: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="serial_tracked"
              checked={formData.item_serial_number_tracked}
              onChange={(e) => setFormData({ ...formData, item_serial_number_tracked: e.target.checked })}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="serial_tracked" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Track Serial Numbers
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
    </SidePanel>
  );
}

