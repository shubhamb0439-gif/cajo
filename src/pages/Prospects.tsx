import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SidePanel from '../components/SidePanel';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

interface Prospect {
  id: string;
  prospect_name: string;
  prospect_email: string | null;
  prospect_phone: string | null;
  prospect_company: string | null;
  prospect_position: string | null;
  prospect_status: string;
  prospect_source: string | null;
  prospect_value: number | null;
  prospect_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    name: string;
  };
}

interface ProspectFormData {
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string;
  prospect_company: string;
  prospect_position: string;
  prospect_status: string;
  prospect_source: string;
  prospect_value: string;
  prospect_notes: string;
  assigned_to: string;
}

interface ProspectFormProps {
  formData: ProspectFormData;
  setFormData: (data: ProspectFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  prospectStatuses: string[];
  leadSources: string[];
  users: any[];
}

function ProspectForm({ formData, setFormData, onSubmit, onCancel, isEdit, prospectStatuses, leadSources, users }: ProspectFormProps) {
  const { getCurrencySymbol } = useCurrency();
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Prospect Name *
        </label>
        <input
          type="text"
          value={formData.prospect_name}
          onChange={(e) => setFormData({ ...formData, prospect_name: e.target.value })}
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
          value={formData.prospect_email}
          onChange={(e) => setFormData({ ...formData, prospect_email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.prospect_phone}
          onChange={(e) => setFormData({ ...formData, prospect_phone: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.prospect_company}
          onChange={(e) => setFormData({ ...formData, prospect_company: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Position
        </label>
        <input
          type="text"
          value={formData.prospect_position}
          onChange={(e) => setFormData({ ...formData, prospect_position: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Status *
        </label>
        <select
          value={formData.prospect_status}
          onChange={(e) => setFormData({ ...formData, prospect_status: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          required
        >
          {prospectStatuses.map(status => (
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
          value={formData.prospect_source}
          onChange={(e) => setFormData({ ...formData, prospect_source: e.target.value })}
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
          value={formData.prospect_value}
          onChange={(e) => setFormData({ ...formData, prospect_value: e.target.value })}
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
          value={formData.prospect_notes}
          onChange={(e) => setFormData({ ...formData, prospect_notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {isEdit ? 'Update Prospect' : 'Create Prospect'}
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

export default function Prospects() {
  const { user, hasWriteAccess } = useAuth();
  const { getCurrencySymbol, isViewOnly } = useCurrency();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [prospectStatuses, setProspectStatuses] = useState<string[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<ProspectFormData>({
    prospect_name: '',
    prospect_email: '',
    prospect_phone: '',
    prospect_company: '',
    prospect_position: '',
    prospect_status: '',
    prospect_source: '',
    prospect_value: '',
    prospect_notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadProspects();
    loadUsers();
    loadDropdowns();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

  const loadProspects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading prospects:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.assigned_to).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('auth_user_id, name')
          .in('auth_user_id', userIds);

        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u.name]));

        const prospectsWithUsers = data.map(prospect => ({
          ...prospect,
          assigned_user: prospect.assigned_to ? { name: userMap.get(prospect.assigned_to) || 'Unknown' } : null
        }));

        setProspects(prospectsWithUsers);
      } else {
        setProspects(data);
      }
    } else {
      setProspects([]);
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
      supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'prospect_status').order('drop_value'),
      supabase.from('dropdown_values').select('drop_value').eq('drop_type', 'lead_source').order('drop_value'),
    ]);

    if (statusRes.data) setProspectStatuses(statusRes.data.map(d => d.drop_value));
    if (sourceRes.data) setLeadSources(sourceRes.data.map(d => d.drop_value));
  };

  const logActivity = async (action: string, details: string) => {
    await supabase.from('activity_logs').insert({
      action: action,
      details: { message: details },
      user_id: user?.id,
    });
  };

  const moveToCustomers = async (prospect: Prospect) => {
    const { data: customerData, error: insertError } = await supabase
      .from('customers')
      .insert({
        customer_name: prospect.prospect_name,
        customer_email: prospect.prospect_email,
        customer_phone: prospect.prospect_phone,
        customer_company: prospect.prospect_company,
        customer_position: prospect.prospect_position,
        customer_status: 'active',
        customer_source: prospect.prospect_source,
        customer_value: prospect.prospect_value,
        customer_notes: prospect.prospect_notes,
        assigned_to: prospect.assigned_to,
        created_by: user?.id,
        updated_by: user?.id,
        original_prospect_id: prospect.id,
      })
      .select()
      .single();

    if (insertError) {
      alert('Error moving to customers: ' + insertError.message);
      return false;
    }

    const { error: deleteError } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospect.id);

    if (deleteError) {
      alert('Error removing prospect: ' + deleteError.message);
      return false;
    }

    await logActivity('Convert Prospect to Customer', `Moved prospect "${prospect.prospect_name}" to customers`);
    return true;
  };

  const handleAdd = () => {
    setFormData({
      prospect_name: '',
      prospect_email: '',
      prospect_phone: '',
      prospect_company: '',
      prospect_position: '',
      prospect_status: prospectStatuses[0] || '',
      prospect_source: '',
      prospect_value: '',
      prospect_notes: '',
      assigned_to: '',
    });
    setShowAddPanel(true);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      prospect_name: prospect.prospect_name,
      prospect_email: prospect.prospect_email || '',
      prospect_phone: prospect.prospect_phone || '',
      prospect_company: prospect.prospect_company || '',
      prospect_position: prospect.prospect_position || '',
      prospect_status: prospect.prospect_status,
      prospect_source: prospect.prospect_source || '',
      prospect_value: prospect.prospect_value?.toString() || '',
      prospect_notes: prospect.prospect_notes || '',
      assigned_to: prospect.assigned_to || '',
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (prospect: Prospect) => {
    if (!confirm(`Are you sure you want to delete prospect "${prospect.prospect_name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospect.id);

    if (error) {
      alert('Error deleting prospect: ' + error.message);
    } else {
      await logActivity('Delete Prospect', `Deleted prospect: ${prospect.prospect_name} (${prospect.prospect_company || 'No company'})`);
      loadProspects();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.prospect_name.trim()) {
      alert('Please enter a prospect name');
      return;
    }

    const prospectData = {
      prospect_name: formData.prospect_name.trim(),
      prospect_email: formData.prospect_email.trim() || null,
      prospect_phone: formData.prospect_phone.trim() || null,
      prospect_company: formData.prospect_company.trim() || null,
      prospect_position: formData.prospect_position.trim() || null,
      prospect_status: formData.prospect_status,
      prospect_source: formData.prospect_source || null,
      prospect_value: formData.prospect_value ? parseFloat(formData.prospect_value) : null,
      prospect_notes: formData.prospect_notes.trim() || null,
      assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' ? formData.assigned_to : null,
    };

    if (showEditPanel && selectedProspect) {
      if (formData.prospect_status === 'won') {
        const moved = await moveToCustomers({ ...selectedProspect, prospect_status: formData.prospect_status });
        if (moved) {
          setShowEditPanel(false);
          loadProspects();
        }
        return;
      }

      const { error } = await supabase
        .from('prospects')
        .update({ ...prospectData, updated_by: user?.id })
        .eq('id', selectedProspect.id);

      if (error) {
        alert('Error updating prospect: ' + error.message);
      } else {
        await logActivity('Update Prospect', `Updated prospect: ${formData.prospect_name} (Status: ${formData.prospect_status})`);
        setShowEditPanel(false);
        loadProspects();
      }
    } else {
      const { error } = await supabase
        .from('prospects')
        .insert({ ...prospectData, created_by: user?.id, updated_by: user?.id });

      if (error) {
        alert('Error creating prospect: ' + error.message);
      } else {
        await logActivity('Create Prospect', `Created new prospect: ${formData.prospect_name} (${formData.prospect_company || 'No company'})`);
        setShowAddPanel(false);
        loadProspects();
      }
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch =
      prospect.prospect_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.prospect_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.prospect_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.prospect_phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || prospect.prospect_status === statusFilter;
    const matchesSource = sourceFilter === 'all' || prospect.prospect_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      qualified: 'bg-blue-100 text-blue-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      demo_scheduled: 'bg-purple-100 text-purple-800',
      demo_completed: 'bg-cyan-100 text-cyan-800',
      proposal_sent: 'bg-yellow-100 text-yellow-800',
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Prospects</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Prospect</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search prospects..."
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
              {prospectStatuses.map(status => (
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
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No prospects found
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{prospect.prospect_name}</div>
                        {prospect.prospect_position && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">{prospect.prospect_position}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {prospect.prospect_company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">{prospect.prospect_email || '-'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{prospect.prospect_phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(prospect.prospect_status)}`}>
                          {capitalize(prospect.prospect_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {prospect.prospect_source ? capitalize(prospect.prospect_source) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {prospect.prospect_value ? `${getCurrencySymbol()}${prospect.prospect_value.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {prospect.assigned_user?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {hasWriteAccess && !isViewOnly && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(prospect)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Edit prospect"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(prospect)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete prospect"
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
        title="New Prospect"
      >
        <ProspectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={false}
          prospectStatuses={prospectStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>

      <SidePanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title="Edit Prospect"
      >
        <ProspectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={true}
          prospectStatuses={prospectStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>
    </div>
  );
}
