import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit,
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Stethoscope
} from 'lucide-react';
import toast from 'react-hot-toast';

const PatientHistory = () => {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, [page, search]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patient/list', {
        params: { page, limit: 10, search },
      });
      setPatients(res.data.patients);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load patient records.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patientId) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/patient/${patientId}`);
      setSelectedPatient(res.data);
    } catch (err) {
      toast.error('Failed to fetch patient history details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (patientId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete patient record ${patientId}?`)) return;
    try {
      await api.delete(`/patient/delete/${patientId}`);
      toast.success(`Patient ${patientId} deleted.`);
      fetchPatients();
      if (selectedPatient?.patient_id === patientId) {
        setSelectedPatient(null);
      }
    } catch (err) {
      toast.error('Failed to delete patient.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Patient Records Directory</h1>
          <p className="text-xs text-slate-500">Manage patient files and historical diagnostic reports</p>
        </div>

        <button
          onClick={() => navigate('/patient/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white font-bold text-sm rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by Patient Name, ID (e.g. PAT0001), Phone, or Email..."
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading Patients Directory...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No patient records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3.5 px-4">Patient ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Age / Gender</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Attending Doctor</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => handlePatientClick(patient.patient_id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-hospital-600 dark:text-hospital-400">
                      {patient.patient_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {patient.full_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {patient.age} yrs / {patient.gender}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>{patient.phone}</div>
                      <div className="text-slate-400">{patient.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      Dr. {patient.doctor_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/predict?patient_id=${patient.patient_id}`)}
                          className="p-1.5 text-hospital-600 hover:bg-hospital-50 dark:hover:bg-hospital-950/50 rounded-lg transition"
                          title="Run AI Prediction Scan"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(patient.patient_id, e)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {patients.length} of {total} Records</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300">Page {page}</span>
            <button
              disabled={page * 10 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-hospital-600">{selectedPatient.patient_id}</span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedPatient.full_name}</h2>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-slate-400 font-bold block">Age / Gender:</span> {selectedPatient.age} yrs / {selectedPatient.gender}</div>
              <div><span className="text-xs text-slate-400 font-bold block">Phone:</span> {selectedPatient.phone}</div>
              <div><span className="text-xs text-slate-400 font-bold block">Email:</span> {selectedPatient.email}</div>
              <div><span className="text-xs text-slate-400 font-bold block">Doctor:</span> Dr. {selectedPatient.doctor_name}</div>
            </div>

            {selectedPatient.symptoms?.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 font-bold block mb-2">Recorded Symptoms:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPatient.symptoms.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostic Scans History */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Diagnostic Scans History ({selectedPatient.prediction_count || 0})</h3>
              {selectedPatient.predictions?.length === 0 ? (
                <p className="text-xs text-slate-400">No chest X-ray scans performed yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPatient.predictions?.map((pred) => (
                    <div key={pred._id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          pred.prediction === 'PNEUMONIA' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {pred.prediction} ({(pred.confidence * 100).toFixed(1)}%)
                        </span>
                        <p className="text-xs text-slate-400 mt-1">Severity: {pred.severity} • {new Date(pred.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPatient(null);
                          navigate(`/reports?predId=${pred._id}`);
                        }}
                        className="px-3 py-1.5 bg-hospital-600 text-white rounded-lg text-xs font-semibold"
                      >
                        View Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const pid = selectedPatient.patient_id;
                  setSelectedPatient(null);
                  navigate(`/predict?patient_id=${pid}`);
                }}
                className="px-4 py-2 bg-hospital-600 hover:bg-hospital-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                <span>Start New Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;
