import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Search, ChevronDown, ChevronRight, Package, Truck, Pencil, Trash2 } from 'lucide-react';
import EditPurchaseOrderForm from '../components/EditPurchaseOrderForm';

interface PurchaseOrder {
  id: string;
  po_number: string;
  delivery_date: string | null;
  payment_terms: string;
  notes: string;
  status: string;
  created_at: string;
  customer_id: string;
  customers: {
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
  };
  purchase_order_items: {
    id: string;
    quantity: number;
    boms: {
      bom_name: string;
      inventory_items: {
        item_name: string;
      };
    };
  }[];
}

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  sale_notes: string | null;
  is_delivered: boolean;
  sale_items: {
    id: string;
    serial_number: string;
  }[];
}

interface Delivery {
  id: string;
  delivery_address: string | null;
  delivery_location: string | null;
  delivery_date: string;
  delivered: boolean;
  delivered_at: string | null;
  delivery_items: {
    id: string;
    sale_item: {
      serial_number: string;
    };
  }[];
}

export default function Orders() {
  const { hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<{ id: string; customer_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderSales, setOrderSales] = useState<Record<string, Sale[]>>({});
  const [orderDeliveries, setOrderDeliveries] = useState<Record<string, Delivery[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [orderHasRelations, setOrderHasRelations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, customerFilter]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        customers(customer_name, customer_email, customer_phone),
        purchase_order_items(
          id,
          quantity,
          bom_id,
          boms(
            bom_name,
            inventory_items(item_name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
    } else {
      setOrders((data as any) || []);
      if (data) {
        checkOrderRelations(data as any);
      }
    }
    setLoading(false);
  };

  const checkOrderRelations = async (ordersList: PurchaseOrder[]) => {
    const relations: Record<string, boolean> = {};

    for (const order of ordersList) {
      const [assembliesRes, salesRes] = await Promise.all([
        supabase
          .from('assemblies')
          .select('id')
          .eq('po_number', order.po_number)
          .limit(1),
        supabase
          .from('sales')
          .select('id')
          .eq('po_number', order.po_number)
          .limit(1)
      ]);

      relations[order.id] = (assembliesRes.data && assembliesRes.data.length > 0) ||
                             (salesRes.data && salesRes.data.length > 0);
    }

    setOrderHasRelations(relations);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, customer_name')
      .order('customer_name');

    if (data) {
      setCustomers(data);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customers.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (customerFilter !== 'all') {
      filtered = filtered.filter(order => order.customer_id === customerFilter);
    }

    setFilteredOrders(filtered);
  };

  const loadOrderHistory = async (poNumber: string) => {
    if (orderSales[poNumber] && orderDeliveries[poNumber]) {
      return;
    }

    setLoadingHistory(prev => ({ ...prev, [poNumber]: true }));

    const [salesRes, deliveriesRes] = await Promise.all([
      supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          sale_date,
          sale_notes,
          is_delivered,
          sale_items (
            id,
            serial_number
          )
        `)
        .eq('po_number', poNumber)
        .order('sale_date', { ascending: false }),

      supabase
        .from('deliveries')
        .select(`
          id,
          delivery_address,
          delivery_location,
          delivery_date,
          delivered,
          delivered_at,
          sale_id,
          delivery_items (
            id,
            sale_item:sale_items (
              serial_number
            )
          )
        `)
        .order('delivery_date', { ascending: false })
    ]);

    if (salesRes.data) {
      setOrderSales(prev => ({ ...prev, [poNumber]: salesRes.data as Sale[] }));

      if (deliveriesRes.data) {
        const saleIds = salesRes.data.map(s => s.id);
        const orderDeliveriesData = deliveriesRes.data.filter((d: any) =>
          saleIds.includes(d.sale_id)
        );
        setOrderDeliveries(prev => ({ ...prev, [poNumber]: orderDeliveriesData as Delivery[] }));
      }
    }

    setLoadingHistory(prev => ({ ...prev, [poNumber]: false }));
  };

  const handleToggleExpand = async (orderId: string, poNumber: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      await loadOrderHistory(poNumber);
    }
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsEditPanelOpen(true);
  };

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete PO ${order.po_number}?`)) {
      return;
    }

    try {
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_id', order.id);

      if (itemsError) throw itemsError;

      const { error: poError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', order.id);

      if (poError) throw poError;

      await loadOrders();
    } catch (err: any) {
      console.error('Error deleting purchase order:', err);
      alert('Failed to delete purchase order: ' + err.message);
    }
  };

  const handleEditSuccess = () => {
    setIsEditPanelOpen(false);
    setEditingOrder(null);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      late: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Customers</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <>
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleExpand(order.id, order.po_number)}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                            {expandedOrder === order.id ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{order.po_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">{order.customers.customer_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{order.customers.customer_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {order.purchase_order_items.length} item(s)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {capitalize(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {hasWriteAccess && !isViewOnly && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(order)}
                                disabled={orderHasRelations[order.id]}
                                className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={orderHasRelations[order.id] ? 'Cannot edit: PO has assemblies or sales' : 'Edit purchase order'}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(order)}
                                disabled={orderHasRelations[order.id]}
                                className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={orderHasRelations[order.id] ? 'Cannot delete: PO has assemblies or sales' : 'Delete purchase order'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                          <td colSpan={8} className="px-6 py-4 space-y-6">
                            {loadingHistory[order.po_number] ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Package size={16} />
                                    Order Details
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-slate-600 dark:text-slate-400">Payment Terms:</span>
                                      <span className="ml-2 text-slate-900 dark:text-white">{order.payment_terms || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-slate-600 dark:text-slate-400">Notes:</span>
                                      <span className="ml-2 text-slate-900 dark:text-white">{order.notes || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-slate-600 dark:text-slate-400">Items:</span>
                                      <ul className="ml-2 mt-1 space-y-1">
                                        {order.purchase_order_items.map((item) => (
                                          <li key={item.id} className="text-slate-900 dark:text-white">
                                            {item.quantity}x {item.boms.bom_name} ({item.boms.inventory_items.item_name})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Package size={16} />
                                    Sales History
                                  </div>
                                  {!orderSales[order.po_number] || orderSales[order.po_number].length === 0 ? (
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">No sales found for this PO</p>
                                  ) : (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                          <tr>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Sale Number</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Date</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Items</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Serial Numbers</th>
                                            <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                          {orderSales[order.po_number].map((sale) => (
                                            <tr key={sale.id}>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{sale.sale_number}</td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                                              </td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{sale.sale_items.length}</td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {sale.sale_items.map(item => item.serial_number).join(', ')}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full ${sale.is_delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                                  {sale.is_delivered ? 'Delivered' : 'Pending'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Truck size={16} />
                                    Delivery History
                                  </div>
                                  {!orderDeliveries[order.po_number] || orderDeliveries[order.po_number].length === 0 ? (
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">No deliveries found for this PO</p>
                                  ) : (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                          <tr>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Date</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Address</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Location</th>
                                            <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Items</th>
                                            <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                          {orderDeliveries[order.po_number].map((delivery) => (
                                            <tr key={delivery.id}>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {new Date(delivery.delivery_date).toLocaleDateString('en-IN')}
                                              </td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {delivery.delivery_address || '-'}
                                              </td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {delivery.delivery_location || '-'}
                                              </td>
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {delivery.delivery_items.map((item, idx) => (
                                                  <div key={item.id}>
                                                    {idx > 0 && ', '}
                                                    {item.sale_item.serial_number}
                                                  </div>
                                                ))}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full ${delivery.delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                                  {delivery.delivered ? 'Completed' : 'Pending'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingOrder && (
        <EditPurchaseOrderForm
          isOpen={isEditPanelOpen}
          onClose={() => {
            setIsEditPanelOpen(false);
            setEditingOrder(null);
          }}
          order={editingOrder}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
