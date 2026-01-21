import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/dateUtils';
import { Search, Filter } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  users: { name: string } | null;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filtered, setFiltered] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredLog, setHoveredLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let result = logs;
    if (search) {
      result = result.filter(log => {
        const message = log.details && typeof log.details === 'object' && 'message' in log.details
          ? String(log.details.message)
          : JSON.stringify(log.details);
        return (
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          message.toLowerCase().includes(search.toLowerCase()) ||
          (log.users?.name || '').toLowerCase().includes(search.toLowerCase())
        );
      });
    }
    if (actionFilter) {
      result = result.filter(log => log.action === actionFilter);
    }
    setFiltered(result);
  }, [logs, search, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*, users(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setLogs(data as ActivityLog[]);
    setLoading(false);
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Activity Log</h1>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                    {log.users?.name || 'System'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        log.action.includes('Create') ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400' :
                        log.action.includes('Update') ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                        log.action.includes('Delete') ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
                        log.action.includes('Convert') ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
                        'bg-slate-100 dark:bg-slate-900/20 text-slate-800 dark:text-slate-400'
                      }`}>
                        {log.action}
                      </span>
                      {log.details && typeof log.details === 'object' && 'message' in log.details && (
                        <span className="text-slate-600 dark:text-slate-400">
                          {String(log.details.message)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No activity logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
