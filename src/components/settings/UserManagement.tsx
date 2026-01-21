import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import SidePanel from '../SidePanel';

type User = Database['public']['Tables']['users']['Row'];

export default function UserManagement() {
  const { hasWriteAccess } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user ${name}?`)) return;
    await supabase.from('users').delete().eq('id', id);
    loadUsers();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Users</h2>
        {hasWriteAccess && (
          <button
            onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Rights</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Enabled</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{user.name}</td>
                <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
                    user.role === 'manager' ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400' :
                    user.role === 'client' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.user_rights === 'read_write' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400'
                  }`}>
                    {user.user_rights === 'read_write' ? 'Read/Write' : 'Read Only'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.enabled ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                  }`}>
                    {user.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  {hasWriteAccess && (
                    <>
                      <button onClick={() => { setEditingUser(user); setShowForm(true); }} className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id, user.name)} className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <UserForm user={editingUser} onClose={() => { setShowForm(false); setEditingUser(null); }} onSuccess={() => { setShowForm(false); setEditingUser(null); loadUsers(); }} />}
    </div>
  );
}

function UserForm({ user, onClose, onSuccess }: { user: User | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
    user_rights: user?.user_rights || 'read_write',
    enabled: user?.enabled ?? true,
    customer_id: user?.customer_id || null,
  });
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; customer_name: string; customer_company: string | null }>>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, customer_name, customer_company').order('customer_company');
    if (data) setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        await supabase.from('users').update({
          name: form.name,
          role: form.role,
          user_rights: form.user_rights,
          enabled: form.enabled,
          customer_id: form.customer_id
        }).eq('id', user.id);
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('users').insert({
            auth_user_id: authData.user.id,
            email: form.email,
            name: form.name,
            role: form.role,
            user_rights: form.user_rights,
            enabled: form.enabled,
            customer_id: form.customer_id,
          });
          if (profileError) throw profileError;
        }
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel isOpen={true} onClose={onClose} title={`${user ? 'Edit' : 'Add'} User`}>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!user} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white disabled:opacity-50" />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' | 'client' | 'manager' })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white">
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
              <option value="manager">Manager</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clients and Managers have access to a separate customer portal. Managers have admin privileges within the portal.
            </p>
          </div>
          {(form.role === 'client' || form.role === 'manager') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer *</label>
              <select
                value={form.customer_id || ''}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value || null })}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_company || customer.customer_name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Client and Manager users must be linked to a customer.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rights *</label>
            <select value={form.user_rights} onChange={(e) => setForm({ ...form, user_rights: e.target.value as 'read_only' | 'read_write' })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white">
              <option value="read_write">Read/Write</option>
              <option value="read_only">Read Only</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Read Only users cannot add, edit, or delete records. They can only view data.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Enabled *</label>
            <select value={form.enabled ? 'true' : 'false'} onChange={(e) => setForm({ ...form, enabled: e.target.value === 'true' })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Disabled users cannot login to the system. New signups are disabled by default.
            </p>
          </div>
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : user ? 'Update' : 'Create'}</button>
          </div>
        </form>
    </SidePanel>
  );
}
