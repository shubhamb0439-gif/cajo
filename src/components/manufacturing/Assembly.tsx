import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatDate } from '../../lib/dateUtils';
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Package, ClipboardList } from 'lucide-react';
import AssemblyForm from './AssemblyForm';

interface Assembly {
  id: string;
  bom_id: string;
  assembly_name: string;
  assembly_quantity: number;
  created_at: string;
  boms: {
    bom_name: string;
    bom_item_id: string;
    inventory_items: { item_id: string; item_name: string };
  };
  users: { name: string } | null;
}

interface AssemblyComponent {
  item_id: string;
  item_name: string;
  quantity_per_unit: number;
  total_used: number;
  source_type: string | null;
  vendor_name: string | null;
}

export default function Assembly() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [filtered, setFiltered] = useState<Assembly[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Assembly | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [assemblyComponents, setAssemblyComponents] = useState<Record<string, AssemblyComponent[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = assemblies;
    if (search) {
      result = result.filter(a =>
        a.assembly_name.toLowerCase().includes(search.toLowerCase()) ||
        a.boms.bom_name.toLowerCase().includes(search.toLowerCase()) ||
        a.boms.inventory_items.item_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [assemblies, search]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('assemblies')
      .select('*, boms(bom_name, bom_item_id, inventory_items(item_id, item_name)), users!assemblies_created_by_fkey(name)')
      .order('created_at', { ascending: false });
    if (data) setAssemblies(data as Assembly[]);
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete assembly "${name}"? This will restore components and remove finished goods from inventory.`)) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reverse-assembly`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            assemblyId: id,
            userId: userProfile?.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete assembly');
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'DELETE_ASSEMBLY',
        details: { assemblyName: name },
      });
      loadData();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete assembly');
    }
  };

  const toggleRowExpansion = async (assemblyId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(assemblyId)) {
      newExpanded.delete(assemblyId);
    } else {
      newExpanded.add(assemblyId);
      if (!assemblyComponents[assemblyId]) {
        const assembly = assemblies.find(a => a.id === assemblyId);
        if (assembly) {
          const { data: bomItems } = await supabase
            .from('bom_items')
            .select('*, inventory_items(item_id, item_name)')
            .eq('bom_id', assembly.bom_id);

          if (bomItems) {
            const components: AssemblyComponent[] = bomItems.map((item: any) => ({
              item_id: item.inventory_items.item_id,
              item_name: item.inventory_items.item_name,
              quantity_per_unit: item.bom_component_quantity,
              total_used: item.bom_component_quantity * assembly.assembly_quantity,
              source_type: null,
              vendor_name: null,
            }));
            setAssemblyComponents(prev => ({ ...prev, [assemblyId]: components }));
          }
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  const handlePrintPicklist = async (assembly: Assembly) => {
    try {
      const { data: bomItems, error } = await supabase
        .from('bom_items')
        .select('*, inventory_items(item_id, item_name)')
        .eq('bom_id', assembly.bom_id);

      if (error) {
        console.error('Error fetching BOM items:', error);
        alert('Failed to fetch BOM items');
        return;
      }

      if (!bomItems || bomItems.length === 0) {
        alert('No components found for this BOM');
        return;
      }

      const components = bomItems.map((item: any) => ({
        item_id: item.inventory_items.item_id,
        item_name: item.inventory_items.item_name,
        quantity_per_unit: item.bom_component_quantity,
        total_quantity: item.bom_component_quantity * assembly.assembly_quantity,
      }));

      const picklistPages = Array.from({ length: assembly.assembly_quantity }, (_, i) => i + 1)
        .map(unitNumber => `
  <div class="picklist-page">
    ${unitNumber === 1 ? `<div class="no-print">
      <button onclick="window.print()" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; font-size: 14px;">Print All</button>
      <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>
    </div>` : ''}

    <div class="header">
      <h1>Stock Picklist - Unit ${unitNumber} of ${assembly.assembly_quantity}</h1>
    </div>

    <div class="info">
      <div class="info-item">
        <span class="info-label">Assembly Name:</span>
        <span>${assembly.assembly_name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">BOM:</span>
        <span>${assembly.boms.bom_name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Finished Good:</span>
        <span>${assembly.boms.inventory_items.item_name} (${assembly.boms.inventory_items.item_id})</span>
      </div>
      <div class="info-item">
        <span class="info-label">Unit Number:</span>
        <span><strong>${unitNumber} of ${assembly.assembly_quantity}</strong></span>
      </div>
      <div class="info-item">
        <span class="info-label">Date:</span>
        <span>${formatDate(new Date())}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="checkbox-col">☐</th>
          <th>Item ID</th>
          <th>Item Name</th>
          <th>Quantity Needed</th>
        </tr>
      </thead>
      <tbody>
        ${components.map(comp => `
          <tr>
            <td class="checkbox-col"><span class="checkbox"></span></td>
            <td>${comp.item_id}</td>
            <td>${comp.item_name}</td>
            <td><strong>${comp.quantity_per_unit}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="signatures">
      <div>
        <div class="signature-line">Picked by</div>
      </div>
      <div>
        <div class="signature-line">Date</div>
      </div>
    </div>
  </div>
        `).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stock Picklist - ${assembly.assembly_name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .picklist-page {
      page-break-after: always;
      margin-bottom: 60px;
    }
    .picklist-page:last-child {
      page-break-after: auto;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .info-item {
      display: flex;
    }
    .info-label {
      font-weight: bold;
      margin-right: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .checkbox-col {
      width: 40px;
      text-align: center;
    }
    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #333;
      display: inline-block;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
      margin-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 8px;
      font-size: 14px;
    }
    .no-print {
      margin-bottom: 20px;
    }
    @media print {
      .no-print {
        display: none;
      }
      body {
        padding: 20px;
      }
      .picklist-page {
        margin-bottom: 0;
      }
    }
  </style>
</head>
<body>
  ${picklistPages}
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (!printWindow) {
        alert('Please allow pop-ups to generate the picklist');
        return;
      }

      printWindow.addEventListener('load', () => {
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error generating picklist:', error);
      alert('Failed to generate picklist');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assemblies</h2>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Assembly</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assemblies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Assembly Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">BOM</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Created By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(assembly => (
                <>
                  <tr key={assembly.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleRowExpansion(assembly.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {expandedRows.has(assembly.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {formatDate(assembly.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {assembly.assembly_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {assembly.boms.bom_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <div className="font-medium">{assembly.boms.inventory_items.item_name}</div>
                      <div className="text-xs text-slate-500">{assembly.boms.inventory_items.item_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {assembly.assembly_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {assembly.users?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handlePrintPicklist(assembly)}
                        className="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-700"
                        title="Generate Picklist"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                      {hasWriteAccess && !isViewOnly && (
                        <>
                          <button
                            onClick={() => { setEditing(assembly); setShowForm(true); }}
                            className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(assembly.id, assembly.assembly_name)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(assembly.id) && (
                    <tr key={`${assembly.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          <Package className="w-4 h-4 inline mr-2" />
                          Components Used
                        </div>
                        {assemblyComponents[assembly.id] && assemblyComponents[assembly.id].length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Item ID</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Item Name</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Qty per Unit</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Total Used</th>
                                <th className="text-left py-2 text-slate-600 dark:text-slate-400">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assemblyComponents[assembly.id].map((comp, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{comp.item_id}</td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{comp.item_name}</td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{comp.quantity_per_unit}</td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">{comp.total_used}</td>
                                  <td className="py-2 text-slate-700 dark:text-slate-300">
                                    {comp.vendor_name || 'Not tracked'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400">No component details available</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12"><p className="text-slate-500">No assemblies found</p></div>}
        </div>
      </div>

      <AssemblyForm
        isOpen={showForm}
        assembly={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSuccess={() => { setShowForm(false); setEditing(null); loadData(); }}
      />
    </div>
  );
}
