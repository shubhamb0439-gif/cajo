import { useState } from 'react';
import { Users, Database, Upload, AlertTriangle, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from '../components/settings/UserManagement';
import DataSetup from '../components/settings/DataSetup';
import BulkUpload from '../components/settings/BulkUpload';
import DangerZone from '../components/settings/DangerZone';
import MessagesAdmin from '../components/settings/MessagesAdmin';

export default function Settings() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'data' | 'bulk' | 'messages' | 'danger'>('users');

  const tabs = [
    { id: 'users' as const, label: 'User Management', icon: Users },
    { id: 'data' as const, label: 'Data Setup', icon: Database },
    { id: 'bulk' as const, label: 'Bulk Upload & Backup', icon: Upload },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ];

  if (userProfile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h2>
          <p className="text-slate-500 dark:text-slate-400">You need administrator privileges to access Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-1 px-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isDanger = tab.danger;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? isDanger
                        ? 'border-red-600 text-red-600 dark:text-red-400'
                        : 'border-green-600 text-green-600 dark:text-green-400'
                      : isDanger
                      ? 'border-transparent text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'data' && <DataSetup />}
          {activeTab === 'bulk' && <BulkUpload />}
          {activeTab === 'messages' && <MessagesAdmin />}
          {activeTab === 'danger' && <DangerZone />}
        </div>
      </div>
    </div>
  );
}
