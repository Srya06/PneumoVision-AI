import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Building2, Plus, RefreshCw, Mail, Phone, MapPin, Building
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data);
    } catch (err) {
      toast.error('Failed to fetch hospital directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/hospitals', formData);
      toast.success('Hospital created successfully!');
      setShowModal(false);
      setFormData({ name: '', address: '', contact_email: '', contact_phone: '' });
      fetchHospitals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create hospital.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-hospital-400" />
            Hospital Directory
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage multi-tenant hospital configurations.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchHospitals}
            className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white font-bold rounded-xl shadow-lg shadow-hospital-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Hospital
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map(h => (
          <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-hospital-500/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-hospital-500/20 text-hospital-400 flex items-center justify-center shrink-0 border border-hospital-500/30">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight">{h.name}</h3>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/50 mt-1 inline-block">Active</span>
              </div>
            </div>
            
            <div className="space-y-3 mt-5 border-t border-slate-800 pt-5">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{h.contact_email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{h.contact_phone}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="leading-snug line-clamp-2">{h.address}</span>
              </div>
            </div>
          </div>
        ))}
        {hospitals.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            No hospitals found. Add your first hospital facility.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-hospital-400" />
                Register Hospital
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHospital} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-hospital-500 focus:ring-1 focus:ring-hospital-500 transition-colors"
                  placeholder="e.g. City General Hospital"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Physical Address</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-hospital-500 focus:ring-1 focus:ring-hospital-500 transition-colors resize-none"
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-hospital-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-hospital-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-hospital-600 hover:bg-hospital-500 rounded-xl shadow-lg shadow-hospital-600/20 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHospitals;
