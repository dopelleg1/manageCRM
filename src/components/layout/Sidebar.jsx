import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Map,
  Building2,
  Users,
  Phone,
  Settings,
  LogOut,
  Store,
  ShoppingBag,
  Shield,
  X,
  DatabaseZap
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Sidebar = ({ isSidebarOpen, setSidebarOpen }) => {
  const { signOut, userRole } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Calendar, label: 'Calendario', path: '/calendar', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Map, label: 'Mappa', path: '/map', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Store, label: 'Attività Commerciali', path: '/activities', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Building2, label: 'Immobili', path: '/properties', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: ShoppingBag, label: 'Potenziali Tabaccherie', path: '/potential-tobacconists', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Users, label: 'Potenziali Acq/Vend', path: '/potential-activities', roles: ['admin', 'agente', 'telemarketing', 'super_admin'] },
    { icon: Phone, label: 'Telemarketing', path: '/telemarketing', roles: ['admin', 'telemarketing', 'super_admin'] },
    { icon: Users, label: 'Agenti', path: '/agents', roles: ['admin', 'super_admin'] },
    { icon: Settings, label: 'Configurazione', path: '/configuration', roles: ['admin', 'super_admin'] },
    { icon: Shield, label: 'Super Admin', path: '/super-admin', roles: ['super_admin'] },
    { icon: DatabaseZap, label: 'Migration Setup', path: '/migration-setup', roles: ['super_admin'] },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLinkClick = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl",
          "w-[220px]",
          "transform transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto md:flex md:flex-col md:h-full md:shadow-none"
        )}
      >
        <div className="p-2 flex items-center justify-center relative border-b border-gray-100 dark:border-gray-700/50">
          <Link to="/dashboard" onClick={handleLinkClick} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-transform transform hover:scale-105">
            <img 
              src="https://horizons-cdn.hostinger.com/82c787d0-7626-4a6c-b758-36c02c602514/fefdc0566f397ed67bdcce40fce20102.webp"
              alt="Studio BP Logo"
              className="hidden md:block max-w-[200px] h-auto" 
            />
            <img 
              src="https://horizons-cdn.hostinger.com/82c787d0-7626-4a6c-b758-36c02c602514/82eeb5bc7de1efa20007d0d7b6aa676b.webp"
              alt="STUDIO BP Business & Houses"
              className="block md:hidden max-w-[160px] h-auto" 
            />
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2" 
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-4">
          {navItems.map((item) => {
              if (item.roles && !item.roles.includes(userRole)) return null;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;