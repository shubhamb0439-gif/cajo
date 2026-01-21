import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import DeliveryPanel from '../components/DeliveryPanel';
import { Pencil, Trash2, Search } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

interface Delivery {
  id: string;
  sale_id: string;
  delivery_address: string | null;
  delivery_location: string | null;
  delivery_date: string;
  delivery_notes: string | null;
  delivered: boolean;
  delivered_at: string | null;
  created_at: string;
  delivery_items: Array<{
    sale_item_id: string;
    sale_items: {
      id: string;
      serial_number: string;
      assembly_units: {
        assemblies: {
          assembly_name: string;
        };
      };
    };
  }>;
  sales: {
    sale_number: string;
    sale_date: string;
    customers: {
      customer_name: string;
      customer_company: string | null;
    };
  };
}

export default function Deliveries() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);

  useEffect(() => {
    loadDeliveries();

    const subscription = supabase
      .channel('deliveries_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, loadDeliveries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_items' }, loadDeliveries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, loadDeliveries)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('deliveries')
      .select(`
        *,
        delivery_items(
          sale_item_id,
          sale_items(
            id,
            serial_number,
            assembly_units(
              assemblies(assembly_name)
            )
          )
        ),
        sales(
          sale_number,
          sale_date,
          customers(customer_name, customer_company)
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setDeliveries(data as any);
    }
    setLoading(false);
  };

  const handleEdit = (delivery: Delivery) => {
    setSelectedDelivery({
      ...delivery,
      sale_number: delivery.sales.sale_number,
      customer_name: delivery.sales.customers.customer_name,
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (delivery: Delivery) => {
    if (!confirm(`Are you sure you want to delete this delivery for ${delivery.sales.sale_number}?`)) {
      return;
    }

    const { error: deliveryError } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', delivery.id);

    if (deliveryError) {
      alert('Error deleting delivery: ' + deliveryError.message);
      return;
    }

    const { error: saleError } = await supabase
      .from('sales')
      .update({ is_delivered: false })
      .eq('id', delivery.sale_id);

    if (saleError) {
      alert('Error updating sale: ' + saleError.message);
      return;
    }

    await supabase.from('activity_logs').insert({
      user_id: userProfile?.id,
      action: 'DELETE_DELIVERY',
      details: {
        saleNumber: delivery.sales.sale_number,
        customerName: delivery.sales.customers.customer_name,
      },
    });

    loadDeliveries();
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch =
      delivery.sales.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sales.customers.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sales.customers.customer_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.delivery_location?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Deliveries</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Track and manage all deliveries</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by sale number, customer, address, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchTerm ? 'No deliveries found matching your search.' : 'No deliveries yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-white">{delivery.sales.sale_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {delivery.sales.customers.customer_name}
                        </div>
                        {delivery.sales.customers.customer_company && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {delivery.sales.customers.customer_company}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {delivery.delivery_items && delivery.delivery_items.length > 0 ? (
                          delivery.delivery_items.map((deliveryItem) => (
                            <div key={deliveryItem.sale_items.id} className="mb-1">
                              <span className="font-medium">
                                {(deliveryItem.sale_items.assembly_units as any)?.assemblies?.assembly_name || 'Unknown'}
                              </span>
                              <br />
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                SN: {deliveryItem.sale_items.serial_number}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">No items selected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {delivery.delivery_address && (
                          <div className="font-medium">{delivery.delivery_address}</div>
                        )}
                        {delivery.delivery_location && (
                          <div className="text-slate-500 dark:text-slate-400">{delivery.delivery_location}</div>
                        )}
                        {!delivery.delivery_address && !delivery.delivery_location && (
                          <span className="text-slate-400 dark:text-slate-500">Not specified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {formatDate(delivery.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={delivery.delivered}
                        disabled
                        className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasWriteAccess && !isViewOnly && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(delivery)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Edit delivery"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(delivery)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete delivery"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditPanel && selectedDelivery && (
        <DeliveryPanel
          delivery={selectedDelivery}
          saleNumber={selectedDelivery.sale_number}
          customerName={selectedDelivery.customer_name}
          onClose={() => {
            setShowEditPanel(false);
            setSelectedDelivery(null);
          }}
          onSuccess={() => {
            setShowEditPanel(false);
            setSelectedDelivery(null);
            loadDeliveries();
          }}
        />
      )}
    </div>
  );
}
