import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  UserPlus, Shield, UserCheck, UserX, Stethoscope,
  RefreshCw, Search, Phone, Mail, Building2, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Radiology', 'Pulmonology', 'Emergency Medicine', 'Internal Medicine',
  'Cardiology', 'Pathology', 'Oncology', 'Pediatrics', 'General Practice',
];

const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    department: 'Radiology',
    phone: '',
    role: 'doctor',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchStats();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/doctors');
      setDoctors(res.data);
    } catch (err) {
      toast.error('Failed to fetch doctor directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      // stats are optional
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/doctors', formData);
      toast.success(`Dr. ${formData.full_name} added to the system!`);
      setShowModal(false);
      setFormData({ username: '', email: '', password: '', full_name: '', department: 'Radiology', phone: '', role: 'doctor' });
      fetchDoctors();
      fetchStats();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to add doctor account.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate account for Dr. ${name}? They will lose access immediately.`)) return;
    try {
      await api.delete(`/admin/doctors/${id}`);
      toast.success(`Dr. ${name}'s account deactivated.`);
      fetchDoctors();
      fetchStats();
    } catch (err) {
      toast.error('Deactivation failed. Please try again.');
    }
  };

  const handleReactivate = async (id, name) => {
    try {
      await api.put(`/admin/doctors/${id}/reactivate`);
      toast.success(`Dr. ${name}'s account reactivated!`);
      fetchDoctors();
      fetchStats();
    } catch (err) {
      toast.error('Reactivation failed. Please try again.');
    }
  };

  // Filter and search
  const filtered = doctors.filter((doc) => {
    const matchesSearch =
      !searchTerm ||
      doc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && doc.is_active) ||
      (filterStatus === 'inactive' && !doc.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">

      {/* ── Stats Banner ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Doctors', value: stats.total_doctors, color: 'text-hospital-400', bg: 'bg-hospital-950/40 border-hospital-800/40' },
            { label: 'Active Doctors', value: stats.active_doctors, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40' },
            { label: 'Total Patients', value: stats.total_patients, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40' },
            { label: 'AI Predictions', value: stats.total_predictions, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/40' },
          ].map((stat) => (
            <div key={stat.label} className={`p-4 rounded-2xl border ${stat.bg}`}>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value ?? '—'}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/40 text-purple-300 rounded-full text-xs font-bold mb-2 border border-purple-700/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Physician Credential Management</span>
          </div>
          <h1 className="text-2xl font-black text-white">Hospital Medical Staff</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered · {doctors.filter(d => d.is_active).length} active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchDoctors(); fetchStats(); }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white font-bold text-sm rounded-xl shadow-md shadow-hospital-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username, email, or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition ${
                filterStatus === s
                  ? 'bg-hospital-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Doctor Table ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-hospital-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading doctor directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Stethoscope className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">
              {doctors.length === 0
                ? 'No doctors registered yet. Click "Add Doctor" to get started.'
                : 'No doctors match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">Physician</th>
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">Credentials</th>
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">Department</th>
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">Contact</th>
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-hospital-600/20 border border-hospital-500/30 flex items-center justify-center text-sm font-black text-hospital-400 shrink-0">
                          {doc.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">Dr. {doc.full_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Joined {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <p className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-lg inline-block">@{doc.username}</p>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">{doc.department || 'General'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-600" />
                          <span className="text-xs text-slate-400">{doc.email}</span>
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-600" />
                            <span className="text-xs text-slate-400">{doc.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      {doc.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-700/30">
                          <UserCheck className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-900/40 text-rose-400 border border-rose-700/30">
                          <UserX className="w-3 h-3" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {doc.is_active ? (
                        <button
                          onClick={() => handleDeactivate(doc.id, doc.full_name)}
                          className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900/60 border border-rose-700/30 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-bold transition"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(doc.id, doc.full_name)}
                          className="px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-700/30 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold transition"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Doctor Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-hospital-600/20 rounded-xl border border-hospital-500/30">
                  <UserPlus className="w-5 h-5 text-hospital-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Register Physician</h2>
                  <p className="text-xs text-slate-400">New doctor credentials will be created immediately</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDoctor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="dr_sarah"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-hospital-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Hospital Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sarah@hospital.org"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-hospital-600/20 transition disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering...
                    </span>
                  ) : (
                    'Register Physician'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
