import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Activity,
  FileText,
  Settings,
  LogOut,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const doctorNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Diagnostics', path: '/predict', icon: Activity },
  { name: 'Register Patient', path: '/patient/new', icon: UserPlus },
  { name: 'Patient History', path: '/patients', icon: Users },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 transition-colors duration-200 z-30 shrink-0">
      <div>
        {/* Logo / Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="p-2 bg-hospital-600 text-white rounded-xl shadow-md shadow-hospital-600/30">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight tracking-wide">
              Pneumo<span className="text-hospital-600 dark:text-hospital-400">Vision</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clinical AI Suite v1.0</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {doctorNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-hospital-600 text-white shadow-md shadow-hospital-600/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-hospital-100 dark:bg-hospital-900/50 text-hospital-700 dark:text-hospital-300 font-black flex items-center justify-center shrink-0 border border-hospital-200 dark:border-hospital-800 text-sm">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'D'}
          </div>
          <div className="truncate">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {user?.full_name?.startsWith('Dr.') ? user?.full_name : `Dr. ${user?.full_name || user?.username}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.department || 'Physician'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
