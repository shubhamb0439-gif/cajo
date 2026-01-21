import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDate } from '../lib/dateUtils';
import { Search, Plus, Pencil, Trash2, Star, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../lib/database.types';
import SidePanel from '../components/SidePanel';

type Vendor = Database['public']['Tables']['vendors']['Row'];

interface VendorPurchase {
  id: string;
  purchase_quantity: number;
  purchase_unit_cost: number;
  purchase_date: string;
  purchase_po_number: string | null;
  purchase_vendor_item_code: string | null;
  purchase_lead_time: number;
  inventory_items: { item_id: string; item_name: string };
}

export default function Vendors() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { formatAmount, getCurrencySymbol, isViewOnly } = useCurrency();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filtered, setFiltered] = useState<Vendor[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [vendorPurchases, setVendorPurchases] = useState<Record<string, VendorPurchase[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = vendors;
    if (search) {
      result = result.filter(v =>
        v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        v.vendor_id.toLowerCase().includes(search.toLowerCase()) ||
        (v.vendor_contact_name && v.vendor_contact_name.toLowerCase().includes(search.toLowerCase())) ||
        (v.vendor_email && v.vendor_email.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (filterGroup) {
      result = result.filter(v => v.vendor_group === filterGroup);
    }
    setFiltered(result);
  }, [vendors, search, filterGroup]);

  const loadData = async () => {
    setLoading(true);
    const vendorsRes = await supabase.from('vendors').select('*').order('vendor_name');
    const groupsRes = await supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'vendor_group');
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (groupsRes.data) setGroups(groupsRes.data.map(g => g.drop_value));
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await supabase.from('vendors').delete().eq('id', id);
    await supabase.from('activity_logs').insert({
      user_id: userProfile?.id,
      action: 'DELETE_VENDOR',
      details: { vendorName: name },
    });
    loadData();
  };

  const toggleRowExpansion = async (vendorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId);
    } else {
      newExpanded.add(vendorId);
      if (!vendorPurchases[vendorId]) {
        const { data } = await supabase
          .from('purchases')
          .select('*, inventory_items(item_id, item_name)')
          .eq('purchase_vendor_id', vendorId)
          .order('purchase_date', { ascending: false });
        if (data) {
          setVendorPurchases(prev => ({ ...prev, [vendorId]: data as VendorPurchase[] }));
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Vendors</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Vendor</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Groups</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Ratings</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(v => (
                <>
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleRowExpansion(v.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {expandedRows.has(v.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{v.vendor_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{v.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{v.vendor_group || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {v.vendor_contact_name && <div className="font-medium">{v.vendor_contact_name}</div>}
                      <div>{v.vendor_email || '-'}</div>
                      <div className="text-xs text-slate-500">{v.vendor_phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <Rating label="P" value={v.vendor_rating_price} />
                        <Rating label="Q" value={v.vendor_rating_quality} />
                        <Rating label="L" value={v.vendor_rating_lead} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      {hasWriteAccess && !isViewOnly && (
                        <>
                          <button onClick={() => { setEditing(v); setShowForm(true); }} className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(v.id, v.vendor_name)} className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(v.id) && (
                    <tr key={`${v.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Purchase History</div>
                        {vendorPurchases[v.id] && vendorPurchases[v.id].length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Item</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Vendor Item Code</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Unit Cost</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Total</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Lead Time</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">PO #</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vendorPurchases[v.id].map((purchase) => (
                                <tr key={purchase.id} className="border-b border-slate-100 dark:border-slate-800">
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {formatDate(purchase.purchase_date)}
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    <div className="font-medium">{purchase.inventory_items.item_name}</div>
                                    <div className="text-xs text-slate-500">{purchase.inventory_items.item_id}</div>
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {purchase.purchase_vendor_item_code || '-'}
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{purchase.purchase_quantity}</td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {getCurrencySymbol()}{formatAmount(purchase.purchase_unit_cost)}
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {getCurrencySymbol()}{formatAmount(purchase.purchase_quantity * purchase.purchase_unit_cost)}
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {purchase.purchase_lead_time > 0 ? `${purchase.purchase_lead_time} days` : '-'}
                                  </td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {purchase.purchase_po_number || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400">No purchases from this vendor yet</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12"><p className="text-slate-500">No vendors found</p></div>}
        </div>
      </div>

      <VendorForm isOpen={showForm} vendor={editing} groups={groups} onClose={() => { setShowForm(false); setEditing(null); }} onSuccess={() => { setShowForm(false); setEditing(null); loadData(); }} />
    </div>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs text-slate-500">{label}:</span>
      <Star className={`w-3 h-3 ${value >= 3 ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
      <span className="text-xs text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

function VendorForm({ isOpen, vendor, groups, onClose, onSuccess }: { isOpen: boolean; vendor: Vendor | null; groups: string[]; onClose: () => void; onSuccess: () => void }) {
  const { userProfile } = useAuth();
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [form, setForm] = useState({
    vendor_id: vendor?.vendor_id || '',
    vendor_name: vendor?.vendor_name || '',
    vendor_name_legal: vendor?.vendor_name_legal || '',
    vendor_group: vendor?.vendor_group || '',
    vendor_contact_name: vendor?.vendor_contact_name || '',
    vendor_email: vendor?.vendor_email || '',
    vendor_phone: vendor?.vendor_phone || '',
    vendor_address: vendor?.vendor_address || '',
    vendor_currency: vendor?.vendor_currency || 'USD',
    vendor_rating_price: vendor?.vendor_rating_price || 0,
    vendor_rating_quality: vendor?.vendor_rating_quality || 0,
    vendor_rating_lead: vendor?.vendor_rating_lead || 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (vendor) {
      setForm({
        vendor_id: vendor.vendor_id || '',
        vendor_name: vendor.vendor_name || '',
        vendor_name_legal: vendor.vendor_name_legal || '',
        vendor_group: vendor.vendor_group || '',
        vendor_contact_name: vendor.vendor_contact_name || '',
        vendor_email: vendor.vendor_email || '',
        vendor_phone: vendor.vendor_phone || '',
        vendor_address: vendor.vendor_address || '',
        vendor_currency: vendor.vendor_currency || 'USD',
        vendor_rating_price: vendor.vendor_rating_price || 0,
        vendor_rating_quality: vendor.vendor_rating_quality || 0,
        vendor_rating_lead: vendor.vendor_rating_lead || 0,
      });
    } else {
      setForm({
        vendor_id: '',
        vendor_name: '',
        vendor_name_legal: '',
        vendor_group: '',
        vendor_contact_name: '',
        vendor_email: '',
        vendor_phone: '',
        vendor_address: '',
        vendor_currency: 'USD',
        vendor_rating_price: 0,
        vendor_rating_quality: 0,
        vendor_rating_lead: 0,
      });
    }
  }, [vendor]);

  const loadCurrencies = async () => {
    const res = await supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'vendor_currency');
    if (res.data) setCurrencies(res.data.map(c => c.drop_value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const avgRating = (form.vendor_rating_price + form.vendor_rating_quality + form.vendor_rating_lead) / 3;
      const dataToSave = { ...form, vendor_rating_average: avgRating };

      if (vendor) {
        await supabase.from('vendors').update({ ...dataToSave, updated_by: userProfile?.id }).eq('id', vendor.id);
        await supabase.from('activity_logs').insert({ user_id: userProfile?.id, action: 'UPDATE_VENDOR', details: { vendorId: vendor.vendor_id } });
      } else {
        await supabase.from('vendors').insert({ ...dataToSave, created_by: userProfile?.id });
        await supabase.from('activity_logs').insert({ user_id: userProfile?.id, action: 'CREATE_VENDOR', details: { vendorId: form.vendor_id } });
      }
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title={`${vendor ? 'Edit' : 'Add'} Vendor`}>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor ID *</label>
            <input type="text" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} required disabled={!!vendor} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor Name *</label>
            <input type="text" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Legal Name</label>
            <input type="text" value={form.vendor_name_legal} onChange={(e) => setForm({ ...form, vendor_name_legal: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group</label>
            <select value={form.vendor_group} onChange={(e) => setForm({ ...form, vendor_group: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white">
              <option value="">Select Group</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
            <input type="text" value={form.vendor_contact_name} onChange={(e) => setForm({ ...form, vendor_contact_name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={form.vendor_email} onChange={(e) => setForm({ ...form, vendor_email: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="tel" value={form.vendor_phone} onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <textarea value={form.vendor_address} onChange={(e) => setForm({ ...form, vendor_address: e.target.value })} rows={2} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
            <select value={form.vendor_currency} onChange={(e) => setForm({ ...form, vendor_currency: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white">
              <option value="">Select Currency</option>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ratings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Price: <span className="text-green-600 dark:text-green-400 font-semibold">{form.vendor_rating_price}</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={form.vendor_rating_price}
                onChange={(e) => setForm({ ...form, vendor_rating_price: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Quality: <span className="text-green-600 dark:text-green-400 font-semibold">{form.vendor_rating_quality}</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={form.vendor_rating_quality}
                onChange={(e) => setForm({ ...form, vendor_rating_quality: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lead Time: <span className="text-green-600 dark:text-green-400 font-semibold">{form.vendor_rating_lead}</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={form.vendor_rating_lead}
                onChange={(e) => setForm({ ...form, vendor_rating_lead: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
          </div>
        <div className="flex space-x-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border-2 border-slate-400 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors">{loading ? 'Saving...' : vendor ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </SidePanel>
  );
}
