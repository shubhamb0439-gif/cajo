import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Truck, Wrench, WifiOff, Camera, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../lib/database.types';
import QRScanner from '../components/QRScanner';
import TicketForm from '../components/TicketForm';

type Device = Database['public']['Tables']['devices']['Row'];
type DeviceHistory = Database['public']['Tables']['device_history']['Row'];

interface DeviceWithHistory extends Device {
  device_history: DeviceHistory[];
}

interface SaleItem {
  id: string;
  serial_number: string;
  delivered: boolean;
  assembly_unit_id: string;
  assembly_units: {
    assembly_id: string;
    assemblies: {
      assembly_name: string;
    };
  };
}

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  sale_notes: string | null;
  is_delivered: boolean;
  sale_items: SaleItem[];
}

export default function ClientDashboard() {
  const { userProfile, isManager, customerCompany } = useAuth();
  const [devices, setDevices] = useState<DeviceWithHistory[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [scanMode, setScanMode] = useState<'offline' | 'online' | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const metrics = {
    ordered: sales.length,
    delivered: sales.filter(s => s.is_delivered).length,
    installed: 0,
    offline: 0,
  };

  useEffect(() => {
    if (userProfile?.customer_id) {
      fetchSales();
      fetchDevices();
      subscribeToDevices();
      subscribeToSales();
    }
  }, [userProfile?.customer_id]);

  const fetchSales = async () => {
    if (!userProfile?.customer_id) return;

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        sale_number,
        sale_date,
        sale_notes,
        is_delivered,
        sale_items(
          id,
          serial_number,
          delivered,
          assembly_unit_id,
          assembly_units(
            assembly_id,
            assemblies(assembly_name)
          )
        )
      `)
      .eq('customer_id', userProfile.customer_id)
      .order('sale_date', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }

    setSales(data as Sale[] || []);
    setLoading(false);
  };

  const fetchDevices = async () => {
    if (!userProfile?.customer_id) return;

    const { data, error } = await supabase
      .from('devices')
      .select('*, device_history(*)')
      .eq('customer_id', userProfile.customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching devices:', error);
      return;
    }

    setDevices(data as DeviceWithHistory[] || []);
  };

  const subscribeToDevices = () => {
    if (!userProfile?.customer_id) return;

    const channel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `customer_id=eq.${userProfile.customer_id}`,
        },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const subscribeToSales = () => {
    if (!userProfile?.customer_id) return;

    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `customer_id=eq.${userProfile.customer_id}`,
        },
        () => {
          fetchSales();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_items',
        },
        () => {
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      salesChannel.unsubscribe();
    };
  };

  const handleScanClick = (mode: 'offline' | 'online') => {
    setScanMode(mode);
    setShowQRScanner(true);
  };

  const handleQRScan = async (qrCode: string) => {
    const device = devices.find(
      (d) => d.qr_code === qrCode || d.device_serial_number === qrCode
    );

    if (!device) {
      alert('Device not found. Please check the QR code or serial number.');
      return;
    }

    setSelectedDevice(device);
    setShowQRScanner(false);
    setShowTicketForm(true);
  };

  const handleTicketSuccess = () => {
    fetchDevices();
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch =
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.sale_items.some(item =>
        item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assembly_units?.assemblies?.assembly_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'delivered' && sale.is_delivered) ||
      (statusFilter === 'pending' && !sale.is_delivered);

    return matchesSearch && matchesFilter;
  });

  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.device_serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = statusFilter === 'all' || device.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {customerCompany ? `${customerCompany} Portal` : 'Client Portal'}
          </h1>
          {isManager && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400">
              Manager
            </span>
          )}
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Welcome, {userProfile?.name}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Lasers Ordered</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{metrics.ordered}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Lasers Delivered</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{metrics.delivered}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Truck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Lasers Installed</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{metrics.installed}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Wrench className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Lasers Offline</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{metrics.offline}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleScanClick('offline')}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-4 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Report Device Offline
        </button>

        <button
          onClick={() => handleScanClick('online')}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Confirm Device Online
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by sale number, serial number, or assembly name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-600 dark:text-slate-400">
              No sales found
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div key={sale.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {sale.sale_number}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.is_delivered
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                      }`}>
                        {sale.is_delivered ? 'Delivered' : 'Pending'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Sale Date:</span>
                        <span className="ml-1 text-slate-900 dark:text-white">
                          {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Items:</span>
                        <span className="ml-1 text-slate-900 dark:text-white">
                          {sale.sale_items.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Delivered Items:</span>
                        <span className="ml-1 text-slate-900 dark:text-white">
                          {sale.sale_items.filter(item => item.delivered).length} / {sale.sale_items.length}
                        </span>
                      </div>
                    </div>
                    {sale.sale_notes && (
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Notes: {sale.sale_notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    className="ml-4 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {expandedSale === sale.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>

                {expandedSale === sale.id && sale.sale_items && sale.sale_items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Sale Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 text-slate-600 dark:text-slate-400">Serial Number</th>
                            <th className="text-left py-2 text-slate-600 dark:text-slate-400">Assembly</th>
                            <th className="text-center py-2 text-slate-600 dark:text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.sale_items.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="py-2 text-slate-700 dark:text-slate-300">{item.serial_number}</td>
                              <td className="py-2 text-slate-700 dark:text-slate-300">{item.assembly_units?.assemblies?.assembly_name || 'N/A'}</td>
                              <td className="py-2 text-center">
                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  item.delivered
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                    : 'bg-slate-100 dark:bg-slate-900/20 text-slate-800 dark:text-slate-400'
                                }`}>
                                  {item.delivered ? 'Delivered' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showQRScanner && scanMode && (
        <QRScanner
          mode={scanMode}
          onScan={handleQRScan}
          onClose={() => {
            setShowQRScanner(false);
            setScanMode(null);
          }}
        />
      )}

      {showTicketForm && selectedDevice && scanMode && (
        <TicketForm
          device={selectedDevice}
          mode={scanMode}
          onClose={() => {
            setShowTicketForm(false);
            setSelectedDevice(null);
            setScanMode(null);
          }}
          onSuccess={handleTicketSuccess}
        />
      )}
    </div>
  );
}
