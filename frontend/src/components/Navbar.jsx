import React, { useState, useEffect } from 'react';
import { Sun, Moon, Search, Bell, ShieldCheck, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user } = useAuth();
  const [modelStatus, setModelStatus] = useState('Checking...');

  useEffect(() => {
    api.get('/health')
      .then(res => {
        if (res.data.model && res.data.model.status === 'loaded') {
          setModelStatus('VGG16 AI Ready');
        } else {
          setModelStatus('Model Standby');
        }
      })
      .catch(() => setModelStatus('System Offline'));
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
      {/* Quick Search */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient ID, name, or MRN..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border-none focus:ring-2 focus:ring-hospital-500 outline-none transition"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Model Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Cpu className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
          <span>{modelStatus}</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.full_name?.startsWith('Dr.') ? user?.full_name : `Dr. ${user?.full_name || user?.username}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user?.department || 'Department of Radiology'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
