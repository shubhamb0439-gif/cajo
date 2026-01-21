import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SalesPanel from '../components/SalesPanel';
import DeliveryPanel from '../components/DeliveryPanel';
import { Pencil, Trash2, Search } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

interface Sale {
  id: string;
  sale_number: string;
  customer_id: string;
  sale_date: string;
  sale_notes: string | null;
  is_delivered: boolean;
  created_at: string;
  customers: {
    customer_name: string;
    customer_company: string | null;
  };
  sale_items: Array<{
    id: string;
    assembly_unit_id: string;
    serial_number: string;
    assembly_units: {
      assemblies: {
        assembly_name: string;
      };
    };
  }>;
  deliveries: Array<{
    id: string;
  }>;
}

export default function Sales() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showDeliveryPanel, setShowDeliveryPanel] = useState(false);

  useEffect(() => {
    loadSales();

    const subscription = supabase
      .channel('sales_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, loadSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, loadSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, loadSales)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSales = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sales')
      .select(`
        *,
        customers(customer_name, customer_company),
        sale_items(
          id,
          assembly_unit_id,
          serial_number,
          assembly_units(
            assemblies(assembly_name)
          )
        ),
        deliveries(
          id,
          delivery_address,
          delivery_location,
          delivery_date,
          delivery_notes
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setSales(data as any);
    }
    setLoading(false);
  };

  const handleEdit = async (sale: Sale) => {
    const { data: saleData } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(
          assembly_unit_id,
          serial_number
        )
      `)
      .eq('id', sale.id)
      .single();

    if (saleData) {
      setSelectedSale({
        ...saleData,
        customer_id: sale.customer_id,
        customer_name: sale.customers.customer_name,
        sale_items: saleData.sale_items || [],
      });
      setShowEditPanel(true);
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Are you sure you want to delete sale ${sale.sale_number}?`)) {
      return;
    }

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', sale.id);

    if (error) {
      alert('Error deleting sale: ' + error.message);
    } else {
      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'DELETE_SALE',
        details: {
          saleNumber: sale.sale_number,
          customerName: sale.customers.customer_name,
        },
      });
      loadSales();
    }
  };

  const handleDeliverToggle = async (sale: Sale) => {
    const newDeliveredState = !sale.is_delivered;

    const { error: updateError } = await supabase
      .from('sales')
      .update({ is_delivered: newDeliveredState, updated_by: userProfile?.id })
      .eq('id', sale.id);

    if (updateError) {
      alert('Error updating delivery status: ' + updateError.message);
      return;
    }

    if (newDeliveredState) {
      const { data: newDelivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          sale_id: sale.id,
          created_by: userProfile?.id,
          updated_by: userProfile?.id,
        })
        .select()
        .single();

      if (deliveryError || !newDelivery) {
        alert('Error creating delivery: ' + deliveryError?.message);
        await supabase.from('sales').update({ is_delivered: false }).eq('id', sale.id);
        return;
      }

      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('id')
        .eq('sale_id', sale.id);

      if (saleItems && saleItems.length > 0) {
        const deliveryItemsToInsert = saleItems.map(item => ({
          delivery_id: newDelivery.id,
          sale_item_id: item.id,
        }));

        const { error: deliveryItemsError } = await supabase
          .from('delivery_items')
          .insert(deliveryItemsToInsert);

        if (deliveryItemsError) {
          alert('Error adding items to delivery: ' + deliveryItemsError.message);
          await supabase.from('deliveries').delete().eq('id', newDelivery.id);
          await supabase.from('sales').update({ is_delivered: false }).eq('id', sale.id);
          return;
        }
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'CREATE_DELIVERY',
        details: {
          saleNumber: sale.sale_number,
          customerName: sale.customers.customer_name,
          itemCount: saleItems?.length || 0,
        },
      });
    } else {
      const { error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('sale_id', sale.id);

      if (deleteError) {
        alert('Error removing delivery: ' + deleteError.message);
        await supabase.from('sales').update({ is_delivered: true }).eq('id', sale.id);
        return;
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'DELETE_DELIVERY',
        details: {
          saleNumber: sale.sale_number,
          customerName: sale.customers.customer_name,
        },
      });
    }

    loadSales();
  };

  const handleEditDelivery = (sale: Sale) => {
    if (sale.deliveries && sale.deliveries.length > 0) {
      setSelectedDelivery({
        ...sale.deliveries[0],
        sale_id: sale.id,
        sale_number: sale.sale_number,
        customer_name: sale.customers.customer_name,
      });
      setShowDeliveryPanel(true);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch =
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customers.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customers.customer_company?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sales</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage customer sales and deliveries</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by sale number, customer name, or company..."
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
                  Sale Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Deliver
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchTerm ? 'No sales found matching your search.' : 'No sales yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-white">{sale.sale_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {sale.customers.customer_name}
                        </div>
                        {sale.customers.customer_company && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {sale.customers.customer_company}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {sale.sale_items.map((item, idx) => (
                          <div key={item.id} className="mb-1">
                            <span className="font-medium">
                              {(item.assembly_units as any)?.assemblies?.assembly_name || 'Unknown'}
                            </span>
                            <br />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              SN: {item.serial_number}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {formatDate(sale.sale_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasWriteAccess && !isViewOnly ? (
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sale.is_delivered}
                            onChange={() => handleDeliverToggle(sale)}
                            className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                          />
                        </label>
                      ) : (
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {sale.is_delivered ? '✓' : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasWriteAccess && !isViewOnly && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Edit sale"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(sale)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete sale"
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

      {showEditPanel && selectedSale && (
        <SalesPanel
          customerId={selectedSale.customer_id}
          customerName={selectedSale.customer_name}
          sale={selectedSale}
          onClose={() => {
            setShowEditPanel(false);
            setSelectedSale(null);
          }}
          onSuccess={() => {
            setShowEditPanel(false);
            setSelectedSale(null);
            loadSales();
          }}
        />
      )}

      {showDeliveryPanel && selectedDelivery && (
        <DeliveryPanel
          delivery={selectedDelivery}
          saleNumber={selectedDelivery.sale_number}
          customerName={selectedDelivery.customer_name}
          onClose={() => {
            setShowDeliveryPanel(false);
            setSelectedDelivery(null);
          }}
          onSuccess={() => {
            setShowDeliveryPanel(false);
            setSelectedDelivery(null);
            loadSales();
          }}
        />
      )}
    </div>
  );
}
