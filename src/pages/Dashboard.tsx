import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDate } from '../lib/dateUtils';
import { Users, Package, ShoppingCart, AlertTriangle, TrendingDown, FileText, IndianRupee, Euro, Clock, Truck } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalVendors: number;
  totalItems: number;
  stockAlerts: number;
}

interface StockAlert {
  id: string;
  item_id: string;
  item_name: string;
  item_stock_current: number;
  item_stock_min: number;
  item_stock_max: number;
}

interface RecentPurchase {
  id: string;
  purchase_quantity: number;
  purchase_unit_cost: number;
  purchase_date: string;
  purchase_po_number: string | null;
  inventory_items: { item_id: string; item_name: string };
  vendors: { vendor_name: string } | null;
}

interface RecentAssembly {
  id: string;
  assembly_name: string;
  assembly_quantity: number;
  created_at: string;
  boms: { bom_name: string };
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  delivery_date: string | null;
  status: string;
  customers: { customer_name: string } | null;
  purchase_order_items: { quantity: number }[];
}

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  customers: { customer_name: string } | null;
  sale_items: { id: string }[];
}

interface Delivery {
  id: string;
  delivery_date: string | null;
  delivered: boolean;
  sales: {
    sale_number: string;
    customers: { customer_name: string } | null;
  } | null;
}

interface Installation {
  id: string;
  device_serial_number: string;
  installed_date: string | null;
  customers: { customer_name: string } | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { currencyMode } = useCurrency();
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalVendors: 0, totalItems: 0, stockAlerts: 0 });
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [recentAssemblies, setRecentAssemblies] = useState<RecentAssembly[]>([]);
  const [totalPOs, setTotalPOs] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [openPOs, setOpenPOs] = useState(0);
  const [latePOs, setLatePOs] = useState(0);
  const [recentPOs, setRecentPOs] = useState<PurchaseOrder[]>([]);
  const [latePODetails, setLatePODetails] = useState<PurchaseOrder[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [recentInstallations, setRecentInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        usersRes,
        vendorsRes,
        itemsRes,
        allItemsRes,
        purchasesRes,
        assembliesRes,
        allPOsRes,
        openPOsRes,
        latePOsRes,
        latePODetailsRes,
        recentPOsRes,
        allSalesRes,
        recentSalesRes,
        recentDeliveriesRes,
        recentInstallationsRes,
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('vendors').select('id', { count: 'exact', head: true }),
        supabase.from('inventory_items').select('id', { count: 'exact', head: true }),
        supabase.from('inventory_items').select('*'),
        supabase.from('purchases').select('*, purchase_items(*, inventory_items(item_name)), vendors(vendor_name)').order('purchase_date', { ascending: false }).limit(3),
        supabase.from('assemblies').select('*, boms(bom_name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'late'),
        supabase.from('purchase_orders').select('*, customers(customer_name), purchase_order_items(quantity)').eq('status', 'late').order('delivery_date', { ascending: true }),
        supabase.from('purchase_orders').select('*, customers(customer_name), purchase_order_items(quantity)').order('created_at', { ascending: false }).limit(3),
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('sales').select('*, customers(customer_name), sale_items(id)').order('sale_date', { ascending: false }).limit(3),
        supabase.from('deliveries').select('*, sales(sale_number, customers(customer_name))').order('delivery_date', { ascending: false }).limit(3),
        supabase.from('devices').select('*, customers(customer_name)').not('installed_date', 'is', null).order('installed_date', { ascending: false }).limit(3),
      ]);

      const alerts = (allItemsRes.data || []).filter(item => {
        const current = Number(item.item_stock_current);
        const min = Number(item.item_stock_min);
        const reorder = Number(item.item_stock_reorder);
        return (min > 0 && current < min) || (reorder > 0 && current <= reorder);
      });

      setStats({
        totalUsers: usersRes.count || 0,
        totalVendors: vendorsRes.count || 0,
        totalItems: itemsRes.count || 0,
        stockAlerts: alerts.length,
      });

      setStockAlerts(alerts);
      setRecentPurchases(purchasesRes.data || []);
      setRecentAssemblies(assembliesRes.data || []);
      setTotalPOs(allPOsRes.count || 0);
      setTotalSales(allSalesRes.count || 0);
      setOpenPOs(openPOsRes.count || 0);
      setLatePOs(latePOsRes.count || 0);
      setLatePODetails(latePODetailsRes.data || []);
      setRecentPOs(recentPOsRes.data || []);
      setRecentSales(recentSalesRes.data || []);
      setRecentDeliveries(recentDeliveriesRes.data || []);
      setRecentInstallations(recentInstallationsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={stats.totalUsers > 0 && userProfile?.role === 'admin' ? () => navigate('/settings') : undefined}
        />
        <StatCard
          icon={Package}
          label="Total Vendors"
          value={stats.totalVendors}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={stats.totalVendors > 0 ? () => navigate('/inventory/vendors') : undefined}
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Items"
          value={stats.totalItems}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={stats.totalItems > 0 ? () => navigate('/inventory/items') : undefined}
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Alerts"
          value={stats.stockAlerts}
          bgColor="bg-red-100 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
        />
      </div>

      {stockAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Stock Alerts</h2>
          </div>
          <div className="space-y-2">
            {stockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/inventory')}
              >
                <div className="flex items-center space-x-3">
                  {alert.item_stock_current < alert.item_stock_min ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{alert.item_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Code: {alert.item_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Current: {alert.item_stock_current}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {alert.item_stock_current < alert.item_stock_min
                      ? `Min: ${alert.item_stock_min}`
                      : `Reorder: ${alert.item_stock_reorder}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {latePODetails.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Late Purchase Orders</h2>
          </div>
          <div className="space-y-2">
            {latePODetails.map((po) => {
              const totalItems = po.purchase_order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              const daysLate = po.delivery_date
                ? Math.floor((new Date().getTime() - new Date(po.delivery_date).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return (
                <div
                  key={po.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate('/sales/purchase-orders')}
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">PO: {po.po_number}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {(po.customers as any)?.customer_name || 'No Customer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      {daysLate} day{daysLate !== 1 ? 's' : ''} late
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Due: {formatDate(po.delivery_date!)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {totalItems} item{totalItems !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Purchases</h2>
          {recentPurchases.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No purchases yet</p>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase) => {
                const itemCount = purchase.purchase_items?.length || 0;
                const firstItem = purchase.purchase_items?.[0];
                return (
                  <div key={purchase.id} className="border-l-4 border-green-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/inventory/purchases')}>
                    <p className="font-medium text-slate-900 dark:text-white">
                      PO: {purchase.po_number}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {purchase.vendors?.vendor_name || 'Unknown Vendor'}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {firstItem && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {firstItem.inventory_items?.item_name} ({firstItem.quantity} units)
                        {itemCount > 1 && ` +${itemCount - 1} more`}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {formatDate(purchase.purchase_date)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Assemblies</h2>
          {recentAssemblies.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No assemblies yet</p>
          ) : (
            <div className="space-y-3">
              {recentAssemblies.map((assembly) => (
                <div key={assembly.id} className="border-l-4 border-green-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/manufacturing/assembly')}>
                  <p className="font-medium text-slate-900 dark:text-white">{assembly.assembly_name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      BOM: {assembly.boms.bom_name}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {assembly.assembly_quantity} units
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {formatDate(assembly.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          label="Total Purchase Orders"
          value={totalPOs}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={totalPOs > 0 ? () => navigate('/sales/purchase-orders') : undefined}
        />
        <StatCard
          icon={currencyMode === 'INR' ? IndianRupee : Euro}
          label="Total Sales"
          value={totalSales}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={totalSales > 0 ? () => navigate('/sales/orders') : undefined}
        />
        <StatCard
          icon={Clock}
          label="Pending Purchase Orders"
          value={openPOs}
          bgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          onClick={openPOs > 0 ? () => navigate('/sales/purchase-orders') : undefined}
        />
        <StatCard
          icon={AlertTriangle}
          label="Late Purchase Orders"
          value={latePOs}
          bgColor="bg-red-100 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          onClick={latePOs > 0 ? () => navigate('/sales/purchase-orders') : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Purchase Orders</h2>
          {recentPOs.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No purchase orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentPOs.map((po) => {
                const totalItems = po.purchase_order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                return (
                  <div key={po.id} className="border-l-4 border-blue-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/sales/purchase-orders')}>
                    <p className="font-medium text-slate-900 dark:text-white">
                      PO: {po.po_number}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {(po.customers as any)?.customer_name || 'No Customer'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        po.status === 'open' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </span>
                      {po.delivery_date && (
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          Due: {formatDate(po.delivery_date)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => {
                const itemCount = sale.sale_items?.length || 0;
                return (
                  <div key={sale.id} className="border-l-4 border-green-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/sales/orders')}>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {sale.sale_number}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {(sale.customers as any)?.customer_name || 'Unknown Customer'}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {formatDate(sale.sale_date)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Deliveries</h2>
          {recentDeliveries.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No deliveries yet</p>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="border-l-4 border-blue-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/sales/deliveries')}>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {(delivery.sales as any)?.sale_number || 'Unknown Sale'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {(delivery.sales as any)?.customers?.customer_name || 'Unknown Customer'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      delivery.delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {delivery.delivered ? 'Delivered' : 'Pending'}
                    </span>
                  </div>
                  {delivery.delivery_date && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {formatDate(delivery.delivery_date)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Installations</h2>
          {recentInstallations.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No installations yet</p>
          ) : (
            <div className="space-y-3">
              {recentInstallations.map((installation) => (
                <div key={installation.id} className="border-l-4 border-green-500 pl-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('/support')}>
                  <p className="font-medium text-slate-900 dark:text-white">
                    SN: {installation.device_serial_number}
                  </p>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {(installation.customers as any)?.customer_name || 'Unknown Customer'}
                  </span>
                  {installation.installed_date && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Installed: {formatDate(installation.installed_date)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  bgColor: string;
  iconColor: string;
  onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, bgColor, iconColor, onClick }: StatCardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-2 border-transparent transition-colors ${
        onClick ? 'cursor-pointer hover:border-green-500 dark:hover:border-green-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-xl`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
