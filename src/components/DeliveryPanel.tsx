import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SaleItem {
  id: string;
  serial_number: string;
  delivered: boolean;
  assembly_units: {
    assemblies: {
      assembly_name: string;
    };
  };
}

interface Delivery {
  id: string;
  sale_id: string;
  delivery_address: string | null;
  delivery_location: string | null;
  delivery_date: string;
  delivery_notes: string | null;
  delivered: boolean;
  delivered_at: string | null;
}

interface DeliveryPanelProps {
  delivery: Delivery;
  saleNumber: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeliveryPanel({ delivery, saleNumber, customerName, onClose, onSuccess }: DeliveryPanelProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    delivery_address: '',
    delivery_location: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_notes: '',
  });

  useEffect(() => {
    if (delivery) {
      setFormData({
        delivery_address: delivery.delivery_address || '',
        delivery_location: delivery.delivery_location || '',
        delivery_date: delivery.delivery_date || new Date().toISOString().split('T')[0],
        delivery_notes: delivery.delivery_notes || '',
      });
      loadSaleItems();
      loadDeliveryItems();
    }
  }, [delivery]);

  const loadSaleItems = async () => {
    const { data } = await supabase
      .from('sale_items')
      .select(`
        id,
        serial_number,
        delivered,
        assembly_units(
          assemblies(assembly_name)
        )
      `)
      .eq('sale_id', delivery.sale_id)
      .order('created_at');

    if (data) {
      setSaleItems(data as any);
    }
  };

  const loadDeliveryItems = async () => {
    const { data } = await supabase
      .from('delivery_items')
      .select('sale_item_id')
      .eq('delivery_id', delivery.id);

    if (data) {
      setSelectedItems(new Set(data.map(item => item.sale_item_id)));
    }
  };

  const toggleItem = (itemId: string) => {
    if (delivery.delivered) return;

    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.size === 0) {
      alert('Please select at least one item for this delivery');
      return;
    }

    setLoading(true);
    try {
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({
          delivery_address: formData.delivery_address || null,
          delivery_location: formData.delivery_location || null,
          delivery_date: formData.delivery_date,
          delivery_notes: formData.delivery_notes || null,
          updated_by: userProfile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      if (deliveryError) throw deliveryError;

      const { error: deleteError } = await supabase
        .from('delivery_items')
        .delete()
        .eq('delivery_id', delivery.id);

      if (deleteError) throw deleteError;

      const deliveryItemsToInsert = Array.from(selectedItems).map(itemId => ({
        delivery_id: delivery.id,
        sale_item_id: itemId,
      }));

      const { error: insertError } = await supabase
        .from('delivery_items')
        .insert(deliveryItemsToInsert);

      if (insertError) throw insertError;

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'UPDATE_DELIVERY',
        details: {
          saleNumber,
          customerName,
          deliveryAddress: formData.delivery_address,
          itemCount: selectedItems.size,
        },
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Failed to update delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item for this delivery');
      return;
    }

    if (!confirm(`Mark ${selectedItems.size} item(s) as delivered? This will update stock levels and cannot be undone.`)) {
      return;
    }

    setDelivering(true);
    try {
      const { data, error } = await supabase.rpc('fulfill_delivery', {
        p_delivery_id: delivery.id,
        p_user_id: userProfile?.id,
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || 'Failed to fulfill delivery');
        return;
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'FULFILL_DELIVERY',
        details: {
          saleNumber,
          customerName,
          deliveryAddress: formData.delivery_address,
          itemCount: selectedItems.size,
        },
      });

      alert('Delivery fulfilled successfully! Stock has been updated.');
      onSuccess();
    } catch (error) {
      console.error('Error fulfilling delivery:', error);
      alert('Failed to fulfill delivery: ' + (error as any).message);
    } finally {
      setDelivering(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Make Delivery
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-1">
            <div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Sale: </span>
              <span className="font-medium text-slate-900 dark:text-white">{saleNumber}</span>
            </div>
            <div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Customer: </span>
              <span className="font-medium text-slate-900 dark:text-white">{customerName}</span>
            </div>
            {delivery.delivered && (
              <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Delivered
                </span>
                {delivery.delivered_at && (
                  <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                    {new Date(delivery.delivered_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Items in this Delivery
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedItems.size} of {saleItems.length} selected
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
              {saleItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No items in this sale
                </p>
              ) : (
                saleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.delivered
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : selectedItems.has(item.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      disabled={delivery.delivered || item.delivered}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {(item.assembly_units as any)?.assemblies?.assembly_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        SN: {item.serial_number}
                      </div>
                    </div>
                    {item.delivered && (
                      <span className="text-xs font-medium text-green-700 dark:text-green-400 flex-shrink-0">
                        Delivered
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Delivery Date
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Delivery Address
              </label>
              <textarea
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                rows={3}
                placeholder="Enter delivery address..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location at Customer Site
              </label>
              <input
                type="text"
                value={formData.delivery_location}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="e.g., Warehouse A, Room 101..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Delivery Notes
              </label>
              <textarea
                value={formData.delivery_notes}
                onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                rows={3}
                placeholder="Additional notes about the delivery..."
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeliver}
                  disabled={delivering || delivery.delivered || selectedItems.size === 0}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {delivering ? 'Processing...' : delivery.delivered ? 'DELIVERED' : 'DELIVER'}
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedItems.size === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update'}
                </button>
              </div>
              {!delivery.delivered && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  {selectedItems.size === 0
                    ? 'Select items to include in this delivery'
                    : `Click DELIVER to ship ${selectedItems.size} item(s) and update stock`
                  }
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
