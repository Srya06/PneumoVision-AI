import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Download, Eye, Calendar, User, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportViewer = () => {
  const [searchParams] = useSearchParams();
  const highlightReportId = searchParams.get('reportId');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/report/list');
      setReports(res.data);
    } catch (err) {
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (reportId) => {
    const token = localStorage.getItem('pv_access_token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${apiBase}/report/download/${reportId}`;
    
    // Trigger direct file download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `PneumoVision_Report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(() => toast.error('Download failed.'));
  };

  const filteredReports = reports.filter(r => 
    r.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
    r._id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Generated PDF Clinical Reports</h1>
          <p className="text-xs text-slate-500">Official hospital diagnostic reports archive</p>
        </div>

        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Search filter */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Patient ID or Report ID..."
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
        />
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading Clinical Reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No PDF reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3.5 px-4">Report ID</th>
                  <th className="py-3.5 px-4">Patient ID</th>
                  <th className="py-3.5 px-4">Generated Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredReports.map((report) => (
                  <tr
                    key={report._id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      report._id === highlightReportId ? 'bg-hospital-50/60 dark:bg-hospital-950/40 font-bold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {report._id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-hospital-600 dark:text-hospital-400">
                      {report.patient_id}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDownload(report._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-hospital-600 hover:bg-hospital-500 text-white rounded-lg text-xs font-bold shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;
