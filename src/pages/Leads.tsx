import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SidePanel from '../components/SidePanel';
import { Pencil, Trash2, Plus, Search, Filter } from 'lucide-react';

interface Lead {
  id: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_position: string | null;
  lead_status: string;
  lead_source: string | null;
  lead_value: number | null;
  lead_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    name: string;
  };
}

interface LeadFormData {
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  lead_company: string;
  lead_position: string;
  lead_status: string;
  lead_source: string;
  lead_value: string;
  lead_notes: string;
  assigned_to: string;
}

interface LeadFormProps {
  formData: LeadFormData;
  setFormData: (data: LeadFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  leadStatuses: string[];
  leadSources: string[];
  users: any[];
}

function LeadForm({ formData, setFormData, onSubmit, onCancel, isEdit, leadStatuses, leadSources, users }: LeadFormProps) {
  const { getCurrencySymbol } = useCurrency();
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Lead Name *
        </label>
        <input
          type="text"
          value={formData.lead_name}
          onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={formData.lead_email}
          onChange={(e) => setFormData({ ...formData, lead_email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.lead_phone}
          onChange={(e) => setFormData({ ...formData, lead_phone: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.lead_company}
          onChange={(e) => setFormData({ ...formData, lead_company: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Position
        </label>
        <input
          type="text"
          value={formData.lead_position}
          onChange={(e) => setFormData({ ...formData, lead_position: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Status *
        </label>
        <select
          value={formData.lead_status}
          onChange={(e) => setFormData({ ...formData, lead_status: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          required
        >
          {leadStatuses.map(status => (
            <option key={status} value={status}>
              {capitalize(status)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Source
        </label>
        <select
          value={formData.lead_source}
          onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        >
          <option value="">Select source...</option>
          {leadSources.map(source => (
            <option key={source} value={source}>
              {capitalize(source)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Estimated Value ({getCurrencySymbol()})
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.lead_value}
          onChange={(e) => setFormData({ ...formData, lead_value: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Assigned To
        </label>
        <select
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        >
          <option value="">Unassigned</option>
          {users.map(u => (
            <option key={u.id} value={u.auth_user_id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.lead_notes}
          onChange={(e) => setFormData({ ...formData, lead_notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {isEdit ? 'Update Lead' : 'Create Lead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Leads() {
  const { user, hasWriteAccess } = useAuth();
  const { getCurrencySymbol, isViewOnly } = useCurrency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>({
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    lead_company: '',
    lead_position: '',
    lead_status: '',
    lead_source: '',
    lead_value: '',
    lead_notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadLeads();
    loadUsers();
    loadDropdowns();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading leads:', error);
      setLoading(false);
      return;
    }

    // Fetch user names for assigned leads
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(l => l.assigned_to).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('auth_user_id, name')
          .in('auth_user_id', userIds);

        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u.name]));

        const leadsWithUsers = data.map(lead => ({
          ...lead,
          assigned_user: lead.assigned_to ? { name: userMap.get(lead.assigned_to) || 'Unknown' } : null
        }));

        setLeads(leadsWithUsers);
      } else {
        setLeads(data);
      }
    } else {
      setLeads([]);
    }

    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, auth_user_id, name, role')
      .eq('enabled', true)
      .in('role', ['user', 'admin'])
      .order('name');

    if (data) {
      setUsers(data);
    }
  };

  const loadDropdowns = async () => {
    const [statusRes, sourceRes] = await Promise.all([
      supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'lead_status').order('drop_value'),
      supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'lead_source').order('drop_value'),
    ]);

    if (statusRes.data) setLeadStatuses(statusRes.data.map(d => d.drop_value));
    if (sourceRes.data) setLeadSources(sourceRes.data.map(d => d.drop_value));
  };

  const logActivity = async (action: string, details: string) => {
    await supabase.from('activity_logs').insert({
      action: action,
      details: { message: details },
      user_id: user?.id,
    });
  };

  const moveToProspects = async (lead: Lead) => {
    const { data: prospectData, error: insertError } = await supabase
      .from('prospects')
      .insert({
        prospect_name: lead.lead_name,
        prospect_email: lead.lead_email,
        prospect_phone: lead.lead_phone,
        prospect_company: lead.lead_company,
        prospect_position: lead.lead_position,
        prospect_status: 'qualified',
        prospect_source: lead.lead_source,
        prospect_value: lead.lead_value,
        prospect_notes: lead.lead_notes,
        assigned_to: lead.assigned_to,
        created_by: user?.id,
        updated_by: user?.id,
        original_lead_id: lead.id,
      })
      .select()
      .single();

    if (insertError) {
      alert('Error moving to prospects: ' + insertError.message);
      return false;
    }

    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (deleteError) {
      alert('Error removing lead: ' + deleteError.message);
      return false;
    }

    await logActivity('Convert Lead to Prospect', `Moved lead "${lead.lead_name}" to prospects`);
    return true;
  };

  const handleAdd = () => {
    setFormData({
      lead_name: '',
      lead_email: '',
      lead_phone: '',
      lead_company: '',
      lead_position: '',
      lead_status: leadStatuses[0] || '',
      lead_source: '',
      lead_value: '',
      lead_notes: '',
      assigned_to: '',
    });
    setShowAddPanel(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      lead_name: lead.lead_name,
      lead_email: lead.lead_email || '',
      lead_phone: lead.lead_phone || '',
      lead_company: lead.lead_company || '',
      lead_position: lead.lead_position || '',
      lead_status: lead.lead_status,
      lead_source: lead.lead_source || '',
      lead_value: lead.lead_value?.toString() || '',
      lead_notes: lead.lead_notes || '',
      assigned_to: lead.assigned_to || '',
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Are you sure you want to delete lead "${lead.lead_name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (error) {
      alert('Error deleting lead: ' + error.message);
    } else {
      await logActivity('Delete Lead', `Deleted lead: ${lead.lead_name} (${lead.lead_company || 'No company'})`);
      loadLeads();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lead_name.trim()) {
      alert('Please enter a lead name');
      return;
    }

    const leadData = {
      lead_name: formData.lead_name.trim(),
      lead_email: formData.lead_email.trim() || null,
      lead_phone: formData.lead_phone.trim() || null,
      lead_company: formData.lead_company.trim() || null,
      lead_position: formData.lead_position.trim() || null,
      lead_status: formData.lead_status,
      lead_source: formData.lead_source || null,
      lead_value: formData.lead_value ? parseFloat(formData.lead_value) : null,
      lead_notes: formData.lead_notes.trim() || null,
      assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' ? formData.assigned_to : null,
    };

    if (showEditPanel && selectedLead) {
      if (formData.lead_status === 'qualified') {
        const moved = await moveToProspects({ ...selectedLead, lead_status: formData.lead_status });
        if (moved) {
          setShowEditPanel(false);
          loadLeads();
        }
        return;
      }

      const { error } = await supabase
        .from('leads')
        .update({ ...leadData, updated_by: user?.id })
        .eq('id', selectedLead.id);

      if (error) {
        alert('Error updating lead: ' + error.message);
      } else {
        await logActivity('Update Lead', `Updated lead: ${formData.lead_name} (Status: ${formData.lead_status})`);
        setShowEditPanel(false);
        loadLeads();
      }
    } else {
      const { error } = await supabase
        .from('leads')
        .insert({ ...leadData, created_by: user?.id, updated_by: user?.id });

      if (error) {
        alert('Error creating lead: ' + error.message);
      } else {
        await logActivity('Create Lead', `Created new lead: ${formData.lead_name} (${formData.lead_company || 'No company'})`);
        setShowAddPanel(false);
        loadLeads();
      }
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleCancel = () => {
    setShowAddPanel(false);
    setShowEditPanel(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sales Leads</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Lead</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              {leadStatuses.map(status => (
                <option key={status} value={status}>
                  {capitalize(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Sources</option>
              {leadSources.map(source => (
                <option key={source} value={source}>
                  {capitalize(source)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{lead.lead_name}</div>
                        {lead.lead_position && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">{lead.lead_position}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.lead_company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">{lead.lead_email || '-'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{lead.lead_phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.lead_status)}`}>
                          {capitalize(lead.lead_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.lead_source ? capitalize(lead.lead_source) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.lead_value ? `${getCurrencySymbol()}${lead.lead_value.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.assigned_user?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {hasWriteAccess && !isViewOnly && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(lead)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Edit lead"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(lead)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete lead"
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
      )}

      <SidePanel
        isOpen={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        title="New Lead"
      >
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={false}
          leadStatuses={leadStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>

      <SidePanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title="Edit Lead"
      >
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={true}
          leadStatuses={leadStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>
    </div>
  );
}
