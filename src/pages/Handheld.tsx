import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import QRScanner from '../components/QRScanner';
import { Scan, Search, History, Package, CheckCircle, XCircle, Truck, Settings, Wifi, WifiOff } from 'lucide-react';

interface Device {
  id: string;
  device_serial_number: string;
  qr_code: string | null;
  status: string;
  customer_id: string;
  location: string | null;
  ordered_date: string | null;
  delivered_date: string | null;
  installed_date: string | null;
  last_online_at: string | null;
}

interface DeviceHistory {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
  location: string | null;
}

export default function Handheld() {
  const { user, userProfile } = useAuth();
  const { isMobile } = useDevice();
  const [showScanner, setShowScanner] = useState(false);
  const [manualSerialNumber, setManualSerialNumber] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusOptions = [
    { value: 'ordered', label: 'Ordered', icon: Package, color: 'bg-blue-500' },
    { value: 'delivered', label: 'Delivered', icon: Truck, color: 'bg-purple-500' },
    { value: 'installed', label: 'Installed', icon: Settings, color: 'bg-yellow-500' },
    { value: 'online', label: 'Online', icon: Wifi, color: 'bg-green-500' },
    { value: 'offline', label: 'Offline', icon: WifiOff, color: 'bg-red-500' },
  ];

  const handleScanSuccess = async (qrCode: string) => {
    setShowScanner(false);
    await loadDeviceByQR(qrCode);
  };

  const handleManualSearch = async () => {
    if (!manualSerialNumber.trim()) {
      setError('Please enter a serial number');
      return;
    }
    await loadDeviceBySerial(manualSerialNumber.trim());
  };

  const loadDeviceByQR = async (qrCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Device not found with this QR code');
        return;
      }

      setSelectedDevice(data);
      setNewStatus(data.status);
      setLocation(data.location || '');
      await loadDeviceHistory(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceBySerial = async (serialNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .eq('device_serial_number', serialNumber)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Device not found with this serial number');
        return;
      }

      setSelectedDevice(data);
      setNewStatus(data.status);
      setLocation(data.location || '');
      await loadDeviceHistory(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceHistory = async (deviceId: string) => {
    try {
      const { data, error: historyError } = await supabase
        .from('device_history')
        .select('*')
        .eq('device_id', deviceId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setDeviceHistory(data || []);
    } catch (err: any) {
      console.error('Error loading device history:', err);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedDevice || !newStatus) {
      setError('Please select a status');
      return;
    }

    if (newStatus === selectedDevice.status) {
      setError('Device is already in this status');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        status: newStatus,
        location: location || null,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'delivered' && !selectedDevice.delivered_date) {
        updateData.delivered_date = new Date().toISOString();
      }
      if (newStatus === 'installed' && !selectedDevice.installed_date) {
        updateData.installed_date = new Date().toISOString();
      }
      if (newStatus === 'online') {
        updateData.last_online_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update(updateData)
        .eq('id', selectedDevice.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('device_history')
        .insert({
          device_id: selectedDevice.id,
          status: newStatus,
          changed_by: userProfile?.id,
          notes: `Status changed by ${userProfile?.full_name || 'user'} via Handheld`,
          location: location || null,
        });

      if (historyError) throw historyError;

      setSuccess(`Device status updated to ${newStatus}`);
      setSelectedDevice({ ...selectedDevice, ...updateData });
      await loadDeviceHistory(selectedDevice.id);

      setTimeout(() => {
        setSuccess(null);
        setSelectedDevice(null);
        setManualSerialNumber('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption ? statusOption.icon : Package;
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption ? statusOption.color : 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cajo Handheld</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Quick device status updates</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!selectedDevice && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Find Device</h2>

            {isMobile && (
              <button
                onClick={() => setShowScanner(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mb-4"
              >
                <Scan className="w-5 h-5" />
                Scan QR Code
              </button>
            )}

            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={manualSerialNumber}
                    onChange={(e) => setManualSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    placeholder="Enter serial number"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleManualSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {selectedDevice && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Device Details</h2>
                <button
                  onClick={() => {
                    setSelectedDevice(null);
                    setManualSerialNumber('');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Serial Number</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedDevice.device_serial_number}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Current Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedDevice.status);
                      return (
                        <>
                          <span className={`w-3 h-3 rounded-full ${getStatusColor(selectedDevice.status)}`} />
                          <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                            {selectedDevice.status}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {selectedDevice.location && (
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Location</label>
                    <p className="text-sm text-slate-900 dark:text-white">{selectedDevice.location}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Update Status</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    New Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setNewStatus(option.value)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            newStatus === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${option.color}`} />
                          <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Warehouse A, Customer Site"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                  </div>
                )}

                <button
                  onClick={handleStatusUpdate}
                  disabled={loading || !newStatus || newStatus === selectedDevice.status}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {deviceHistory.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent History</h2>
                </div>

                <div className="space-y-3">
                  {deviceHistory.map((history) => (
                    <div
                      key={history.id}
                      className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                    >
                      <span className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(history.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                          {history.status}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{history.notes}</p>
                        )}
                        {history.location && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                            Location: {history.location}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {new Date(history.changed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
          title="Scan Device QR Code"
        />
      )}
    </div>
  );
}
