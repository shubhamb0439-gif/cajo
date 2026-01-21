import { useState, useEffect } from 'react';
import { Menu, Moon, Sun, User, LogOut, Lock, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import EditProfilePanel from './EditProfilePanel';
import ChangePasswordPanel from './ChangePasswordPanel';

interface TopbarProps {
  onMenuClick: () => void;
  onMessageClick: () => void;
  unreadMessageCount: number;
  hideMenuButton?: boolean;
  isClientPortal?: boolean;
}

export default function Topbar({ onMenuClick, onMessageClick, unreadMessageCount, hideMenuButton = false, isClientPortal = false }: TopbarProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { userProfile, signOut, isManager } = useAuth();
  const { currencyMode, toggleCurrency } = useCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const isDark = savedMode === null ? true : savedMode === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 h-[73px] relative z-30">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-4">
          {!hideMenuButton && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          <div className="flex items-center space-x-2">
            {isClientPortal && (
              <>
                <img
                  src="/cajo_a.png"
                  alt="Cajo Logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  <span className="hidden md:inline">Cajo Technologies</span>
                  <span className="md:hidden">Cajo India</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center space-x-2">
          {currencyMode === 'EUR' && (
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 mr-2">
              VIEW ONLY MODE
            </span>
          )}

          {!isClientPortal && (
            <>
              <button
                onClick={toggleCurrency}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                aria-label="Toggle currency"
                title={`Switch to ${currencyMode === 'INR' ? 'EUR' : 'INR'}`}
              >
                <span className="text-3xl w-8 h-8 flex items-center justify-center">
                  {currencyMode === 'INR' ? '🇮🇳' : '🇪🇺'}
                </span>
              </button>

              <button
                onClick={onMessageClick}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative flex items-center justify-center"
                aria-label="Messages"
              >
                <MessageCircle className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </button>
            </>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-6 h-6 text-slate-400" />
            ) : (
              <Moon className="w-6 h-6 text-slate-600" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {userProfile?.profile_pic ? (
                <img
                  src={userProfile.profile_pic}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-green-600"
                />
              ) : (
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {userProfile?.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {userProfile?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowEditProfile(true);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <User className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowChangePassword(true);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </button>

                  {isManager && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showEditProfile && <EditProfilePanel onClose={() => setShowEditProfile(false)} />}
      {showChangePassword && <ChangePasswordPanel onClose={() => setShowChangePassword(false)} />}
    </header>
  );
}
