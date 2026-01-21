import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Factory,
  Activity,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  Box,
  Users,
  ShoppingCart,
  Layers,
  FileText,
  TrendingUp,
  Target,
  UserPlus,
  Receipt,
  Truck,
  Headset,
  ClipboardList,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import AboutPresentation from './AboutPresentation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const allNavigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  {
    name: 'Sales',
    to: '/sales',
    icon: TrendingUp,
    subItems: [
      { name: 'Leads', to: '/sales/leads', icon: Target },
      { name: 'Prospects', to: '/sales/prospects', icon: UserPlus },
      { name: 'Customers', to: '/sales/customers', icon: Users },
      { name: 'Orders', to: '/sales/purchase-orders', icon: ClipboardList },
      { name: 'Sales', to: '/sales/orders', icon: Receipt },
      { name: 'Deliveries', to: '/sales/deliveries', icon: Truck },
    ]
  },
  {
    name: 'Inventory',
    to: '/inventory',
    icon: Package,
    subItems: [
      { name: 'Vendors', to: '/inventory/vendors', icon: Users },
      { name: 'Items', to: '/inventory/items', icon: Box },
      { name: 'Purchases', to: '/inventory/purchases', icon: ShoppingCart },
    ]
  },
  {
    name: 'Manufacturing',
    to: '/manufacturing',
    icon: Factory,
    subItems: [
      { name: 'BOM Builder', to: '/manufacturing/bom', icon: Layers },
      { name: 'Assembly', to: '/manufacturing/assembly', icon: Factory },
      { name: 'Traceability', to: '/manufacturing/traceability', icon: FileText },
    ]
  },
  { name: 'Support', to: '/support', icon: Headset },
  { name: 'Activity Log', to: '/activity', icon: Activity },
  { name: 'Settings', to: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [showAboutPresentation, setShowAboutPresentation] = useState(false);

  const navigation = allNavigation.filter(item =>
    !item.adminOnly || userProfile?.role === 'admin'
  );
  const [expandedItem, setExpandedItem] = useState<string | null>(() => {
    if (location.pathname.startsWith('/sales')) return 'Sales';
    if (location.pathname.startsWith('/inventory')) return 'Inventory';
    if (location.pathname.startsWith('/manufacturing')) return 'Manufacturing';
    return null;
  });

  const toggleExpand = (itemName: string) => {
    setExpandedItem(expandedItem === itemName ? null : itemName);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          {collapsed ? (
            // Collapsed: Just logo, clickable to expand
            <div className="flex items-center justify-center h-[73px] border-b border-slate-200 dark:border-slate-700">
              <button onClick={onToggleCollapse} className="hover:opacity-80 transition-opacity">
                <img src="/cajo_a.png" alt="Cajo ERP" className="h-10 w-10" />
              </button>
            </div>
          ) : (
            // Expanded: Logo, title, role, and X button
            <div className="flex items-center justify-between px-4 h-[73px] border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <img src="/cajo_a.png" alt="Cajo ERP" className="h-10 w-10" />
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Cajo ERP
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {userProfile?.role || 'User'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleCollapse}
                className="hidden md:block p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button
                onClick={onClose}
                className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-0">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.subItems ? (
                  <>
                    {collapsed ? (
                      // Collapsed: Show submenu icons directly
                      <div className="space-y-1">
                        {item.subItems.map((subItem) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `flex items-center justify-center px-3 py-3 rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`
                            }
                            title={subItem.name}
                          >
                            {({ isActive }) => (
                              <subItem.icon className={`w-5 h-5 ${isActive ? 'text-green-600 dark:text-green-400' : ''}`} />
                            )}
                          </NavLink>
                        ))}
                      </div>
                    ) : (
                      // Expanded: Full menu with subitems
                      <>
                        <button
                          onClick={() => toggleExpand(item.name)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {expandedItem === item.name ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {expandedItem === item.name && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.subItems.map((subItem) => (
                              <NavLink
                                key={subItem.name}
                                to={subItem.to}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                    isActive
                                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <subItem.icon className={`w-4 h-4 ${isActive ? 'text-green-600 dark:text-green-400' : ''}`} />
                                    <span className="text-sm font-medium">{subItem.name}</span>
                                  </>
                                )}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center ${collapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-3 py-2'} rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-green-600 dark:text-green-400' : ''}`} />
                        {!collapsed && <span className="font-medium">{item.name}</span>}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* About Button */}
          <div className="p-4">
            <button
              onClick={() => {
                setShowAboutPresentation(true);
                onClose();
              }}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-3 py-2'} rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`}
              title={collapsed ? 'About Cajo ERP' : undefined}
            >
              <Info className="w-5 h-5" />
              {!collapsed && <span className="font-medium">About</span>}
            </button>
          </div>

          {/* Footer - Version */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            {collapsed ? (
              <div className="text-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400" title="Version 4.0">
                  v4.0
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Version 4.0
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <AboutPresentation
        isOpen={showAboutPresentation}
        onClose={() => setShowAboutPresentation(false)}
      />
    </>
  );
}
