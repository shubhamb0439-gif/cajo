import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

interface TicketFormProps {
  device: Device;
  mode: 'offline' | 'online';
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketForm({ device, mode, onClose, onSuccess }: TicketFormProps) {
  const { userProfile } = useAuth();
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.customer_id) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'offline') {
        const { error: ticketError } = await supabase.from('tickets').insert({
          device_id: device.id,
          customer_id: userProfile.customer_id,
          ticket_type: 'offline',
          status: 'open',
          priority,
          description: description || 'Device reported offline',
          raised_by: userProfile.id,
        });

        if (ticketError) throw ticketError;

        const { error: deviceError } = await supabase
          .from('devices')
          .update({ status: 'offline' })
          .eq('id', device.id);

        if (deviceError) throw deviceError;
      } else {
        const { data: openTickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('device_id', device.id)
          .eq('status', 'open')
          .eq('ticket_type', 'offline');

        if (openTickets && openTickets.length > 0) {
          const { error: ticketError } = await supabase
            .from('tickets')
            .update({
              status: 'closed',
              closed_by: userProfile.id,
              closed_at: new Date().toISOString(),
              resolution_notes: description || 'Device confirmed online',
            })
            .eq('id', openTickets[0].id);

          if (ticketError) throw ticketError;
        }

        const { error: deviceError } = await supabase
          .from('devices')
          .update({
            status: 'online',
            last_online_at: new Date().toISOString(),
          })
          .eq('id', device.id);

        if (deviceError) throw deviceError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === 'offline' ? 'Report Device Offline' : 'Confirm Device Online'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">Device</div>
            <div className="font-medium text-slate-900 dark:text-white mt-1">
              {device.device_serial_number}
            </div>
            {device.location && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Location: {device.location}
              </div>
            )}
          </div>

          {mode === 'offline' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {mode === 'offline' ? 'Issue Description' : 'Resolution Notes'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                mode === 'offline'
                  ? 'Describe the issue...'
                  : 'Add any notes about the resolution...'
              }
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'offline'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Submitting...' : mode === 'offline' ? 'Report Offline' : 'Confirm Online'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
