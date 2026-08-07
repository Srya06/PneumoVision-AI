import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Shield, Stethoscope, BarChart3, LogOut, Settings, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Top Navigation Bar ── */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-40 sticky top-0">

        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-hospital-600 rounded-xl shadow-lg shadow-hospital-600/30">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-wide leading-none">PneumoVision AI</h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Admin Console</p>
            </div>
          </div>

          {/* Separator */}
          <div className="h-7 w-px bg-slate-700 mx-2" />

          {/* Admin Nav Links */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/admin/doctors"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Users className="w-4 h-4" />
              <span>Doctor Management</span>
            </NavLink>
          </nav>
        </div>

        {/* Right: Admin Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* Admin Badge */}
          <div className="flex items-center gap-2.5 px-4 py-2 bg-purple-950/50 border border-purple-800/40 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-black text-purple-300">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{user?.full_name || user?.username}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-purple-400" />
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Administrator</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-xl transition-all duration-200 border border-transparent hover:border-rose-800/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Admin Banner ── */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-b border-purple-800/20 px-8 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Shield className="w-4 h-4 text-purple-400 shrink-0" />
          <p className="text-xs text-purple-300 font-medium">
            <span className="font-bold text-purple-200">Administrator Mode</span> — You have full system control.
            Use this console to manage doctor accounts. Doctors use the separate Physician Portal to access patient data and AI diagnostics.
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8">
        <p className="text-xs text-slate-600">PneumoVision AI Admin Console · v1.0</p>
        <p className="text-xs text-slate-600">© 2026 PneumoVision AI Systems</p>
      </footer>
    </div>
  );
};

export default AdminLayout;
