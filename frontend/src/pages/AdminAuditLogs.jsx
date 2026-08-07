import React, { useState, useEffect } from 'react';
import { Activity, Search, Shield, ChevronLeft, ChevronRight, UserCircle, FileText, DownloadCloud } from 'lucide-react';
import api from '../api/axios';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit/logs`, {
        params: {
          page,
          limit,
          search
        }
      });
      setLogs(res.data.logs);
      setTotalPages(Math.ceil(res.data.total / limit));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on search
    fetchLogs();
  };

  // Helper to format action badges
  const getActionBadge = (action) => {
    if (!action) return <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">UNKNOWN</span>;
    
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('create') || actionLower.includes('register')) {
      return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">{action}</span>;
    }
    if (actionLower.includes('delete') || actionLower.includes('fail')) {
      return <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold">{action}</span>;
    }
    if (actionLower.includes('update') || actionLower.includes('review') || actionLower.includes('edit')) {
      return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">{action}</span>;
    }
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">{action}</span>;
    }
    if (actionLower.includes('predict') || actionLower.includes('generate')) {
      return <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold">{action}</span>;
    }
    
    return <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{action}</span>;
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/audit/export', {
        params: { search },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export logs.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-hospital-600" />
            System Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Immutable ledger of all critical system activity and access.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by action, user, or resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-hospital-500 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </form>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition whitespace-nowrap"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-4 w-40">Timestamp</th>
                <th className="py-3 px-4 w-48">User ID</th>
                <th className="py-3 px-4 w-32">Action</th>
                <th className="py-3 px-4 w-40">Resource</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 mt-3 font-semibold">Loading Audit Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No audit records found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={log.user_id}>
                          {log.user_id || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate max-w-[120px]" title={log.resource}>
                          {log.resource}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate block max-w-md" title={log.details}>
                        {log.details || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
