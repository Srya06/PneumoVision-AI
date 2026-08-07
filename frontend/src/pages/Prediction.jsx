import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../api/axios';
import {
  UploadCloud,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
  UserPlus,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Prediction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(searchParams.get('patient_id') || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  // Grad-CAM visualization slider (0 = original image, 100 = full heatmap overlay)
  const [heatmapOpacity, setHeatmapOpacity] = useState(100);

  const loadPatients = () => {
    setPatientsLoading(true);
    setPatientsError(false);
    api.get('/patient/list', { params: { limit: 100 } })
      .then((res) => {
        setPatients(res.data.patients || []);
        setPatientsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load patient options:', err);
        setPatientsError(true);
        setPatientsLoading(false);
        toast.error('Could not load patient list. Check your connection.');
      });
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const onDrop = (acceptedFiles) => {
    const selected = acceptedFiles[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds maximum 10MB limit.');
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setPredictionResult(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
  });

  const handleRunPrediction = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a registered patient first.');
      return;
    }
    if (!file) {
      toast.error('Please upload a chest X-ray image.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', selectedPatientId);
    formData.append('doctor_notes', doctorNotes);

    try {
      const res = await api.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPredictionResult(res.data);
      toast.success(`Analysis Complete: ${res.data.prediction} (${res.data.confidence}%)`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Prediction request failed. Ensure the backend server is running.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!predictionResult?.prediction_id) return;
    try {
      const res = await api.post(`/report/generate/${predictionResult.prediction_id}`);
      toast.success('PDF Report generated successfully!');
      navigate(`/reports?reportId=${res.data.report_id}`);
    } catch (err) {
      toast.error('Failed to generate PDF report.');
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setPredictionResult(null);
    setDoctorNotes('');
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const canPredict = !loading && !!file && !!selectedPatientId;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-hospital-100 dark:bg-hospital-950 text-hospital-700 dark:text-hospital-300 rounded-full text-xs font-bold mb-2 border border-hospital-200 dark:border-hospital-800">
            <Cpu className="w-3.5 h-3.5" />
            <span>VGG16 Neural Network Inference Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AI Chest X-Ray Diagnostics &amp; Grad-CAM Analysis
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Upload DICOM/Standard Radiograph → Run Real-Time AI Inference → Visual Heatmap Localization
          </p>
        </div>

        {predictionResult && (
          <button
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Analyze New Image</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patient Select & Image Upload */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Patient Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-hospital-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>Select Patient File</span>
            </h2>

            {patientsLoading ? (
              <div className="flex items-center gap-3 py-3 text-slate-500 text-sm">
                <span className="w-4 h-4 border-2 border-hospital-500 border-t-transparent rounded-full animate-spin shrink-0" />
                Loading patients...
              </div>
            ) : patientsError ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Failed to load patients. Backend may be offline.</span>
                </div>
                <button
                  onClick={loadPatients}
                  className="text-xs px-3 py-2 bg-hospital-600 hover:bg-hospital-500 text-white rounded-lg font-bold transition"
                >
                  Retry
                </button>
              </div>
            ) : patients.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  No patients registered yet.
                </p>
                <button
                  onClick={() => navigate('/patient/new')}
                  className="flex items-center gap-2 text-xs px-4 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white rounded-xl font-bold transition w-full justify-center"
                >
                  <UserPlus className="w-4 h-4" />
                  Register First Patient
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-hospital-500 outline-none text-sm"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.patient_id} — {p.full_name} ({p.age} yrs, {p.gender})
                    </option>
                  ))}
                </select>

                {!selectedPatientId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      Need a new patient?{' '}
                      <button onClick={() => navigate('/patient/new')} className="underline font-bold">
                        Register here
                      </button>
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Step 2: X-Ray Drag & Drop Upload */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-hospital-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>Upload Chest Radiograph</span>
            </h2>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragActive
                  ? 'border-hospital-500 bg-hospital-50/50 dark:bg-hospital-950/40'
                  : file
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-hospital-400 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="relative group w-full">
                  <img src={preview} alt="X-ray preview" className="max-h-64 mx-auto rounded-xl shadow-md object-contain" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-bold">
                    Click or Drag to replace image
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-hospital-100 dark:bg-hospital-950 text-hospital-600 dark:text-hospital-400 rounded-2xl">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isDragActive ? 'Drop X-Ray image here' : 'Drag & drop Chest X-Ray here'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WebP (Max 10MB)</p>
                  </div>
                </>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{file.name} ({(file.size / 1024).toFixed(0)} KB) — ready</span>
              </div>
            )}
          </div>

          {/* Doctor Notes Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clinical Doctor Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter initial clinical observations or stethoscopic findings..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>

          {/* Predict Action Button */}
          <div className="space-y-2">
            <button
              onClick={handleRunPrediction}
              disabled={!canPredict}
              className="w-full py-4 bg-hospital-600 hover:bg-hospital-500 text-white font-extrabold rounded-2xl shadow-lg shadow-hospital-600/30 flex items-center justify-center gap-2 text-base transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Executing VGG16 Neural Network...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Run Diagnostic AI Pipeline</span>
                </>
              )}
            </button>

            {/* Hint text showing what's missing */}
            {!loading && (!selectedPatientId || !file) && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                {!selectedPatientId && !file
                  ? 'Select a patient and upload an X-ray to enable analysis'
                  : !selectedPatientId
                  ? '⚠ Select a patient to enable analysis'
                  : '⚠ Upload a chest X-ray to enable analysis'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: AI Output & Grad-CAM Heatmap Viewer */}
        <div className="lg:col-span-7">
          {!predictionResult ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[500px] text-slate-400">
              <Activity className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Awaiting Image Inference</h3>
              <p className="text-xs max-w-sm mt-2 text-slate-400">
                Select a patient and upload a chest radiograph to view real-time AI classification, visual heatmap overlays, and severity scores.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Prediction Result Banner */}
              <div
                className={`p-6 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  predictionResult.prediction === 'PNEUMONIA'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-800'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {predictionResult.prediction === 'PNEUMONIA' ? (
                      <AlertTriangle className="w-6 h-6 text-rose-200" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">Diagnostic Classification</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight mt-1">{predictionResult.prediction}</h2>
                  <p className="text-xs text-white/80 mt-1">
                    Model: {predictionResult.model} • Latency: {predictionResult.inference_time}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1 text-right">
                  <div>
                    <span className="text-xs font-bold text-white/80 uppercase block">Confidence Score</span>
                    <span className="text-3xl font-black">{predictionResult.confidence}%</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">
                      Severity: {predictionResult.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grad-CAM Heatmap Viewer Panel */}
              {predictionResult.heatmap && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-hospital-600" />
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Grad-CAM Heatmap Localization</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Block5_Conv3 Layer</span>
                  </div>

                  {/* Heatmap Image Viewer */}
                  <div className="relative aspect-square max-h-96 mx-auto bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${predictionResult.heatmap}`}
                      alt="Grad-CAM Heatmap"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div
                      className="hidden absolute inset-0 items-center justify-center text-slate-500 text-sm font-semibold"
                    >
                      Heatmap not available
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 text-center italic">
                    * Red/warm regions indicate specific anatomical areas influencing the neural network prediction.
                  </p>
                </div>
              )}

              {/* Clinical Recommendations */}
              {predictionResult.recommendation?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-hospital-600" />
                    <span>Clinical Recommendations &amp; Guidelines</span>
                  </h3>

                  <ul className="space-y-2.5">
                    {predictionResult.recommendation.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-hospital-100 dark:bg-hospital-950 text-hospital-700 dark:text-hospital-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generate PDF Report Button */}
              <div className="pt-2">
                <button
                  onClick={handleGenerateReport}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-base transition"
                >
                  <FileText className="w-5 h-5" />
                  <span>Generate &amp; Download PDF Hospital Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prediction;
