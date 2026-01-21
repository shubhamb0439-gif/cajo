import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MessagingPanel from './MessagingPanel';
import HelpChatbot from './HelpChatbot';
import { HelpCircle } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [messagingPanelOpen, setMessagingPanelOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [helpChatbotOpen, setHelpChatbotOpen] = useState(false);

  const isClient = userProfile?.role === 'client' || userProfile?.role === 'manager';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 border-t-[3px] relative" style={{ borderTopColor: '#b5272d' }}>
      <div className="absolute left-0 right-0 w-full group flex justify-center" style={{ top: '-5px', zIndex: 10000 }}>
        <div className="fixed left-0 right-0 w-screen max-w-none transition-all duration-300 h-0 group-hover:h-[25px] overflow-hidden" style={{ top: '0', zIndex: 9999, backgroundColor: '#b5272d' }}>
          <div className="flex items-center justify-center h-[25px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
            <p className="text-sm">Built by OG+ Rapid Coding Services • info@ogplus.in</p>
          </div>
        </div>
        <img
          src="/ogplus.png"
          alt="OG+ Logo"
          className="h-4 w-auto relative transition-all duration-300 group-hover:translate-y-[25px]"
          style={{ zIndex: 10001 }}
        />
      </div>
      {!isClient && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onMessageClick={() => setMessagingPanelOpen(!messagingPanelOpen)}
          unreadMessageCount={unreadMessageCount}
          hideMenuButton={isClient}
          isClientPortal={isClient}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <MessagingPanel
        isOpen={messagingPanelOpen}
        onClose={() => setMessagingPanelOpen(false)}
        onUnreadCountChange={setUnreadMessageCount}
      />

      <HelpChatbot
        isOpen={helpChatbotOpen}
        onClose={() => setHelpChatbotOpen(false)}
      />

      {!helpChatbotOpen && (
        <button
          onClick={() => setHelpChatbotOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40 group"
          aria-label="Open Help Center"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="absolute right-16 bottom-3 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Help Center
          </span>
        </button>
      )}
    </div>
  );
}
