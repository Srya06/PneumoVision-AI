import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Percent,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Cpu,
  PlusCircle,
  FileText
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading Clinical Analytics...</p>
        </div>
      </div>
    );
  }

  // Chart configs
  const weeklyLabels = stats?.weekly_cases?.map((item) => item.date) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = stats?.weekly_cases?.map((item) => item.cases) || [0, 0, 0, 0, 0, 0, 0];

  const weeklyChartConfig = {
    labels: weeklyLabels,
    datasets: [
      {
        label: 'Scans Processed',
        data: weeklyData,
        backgroundColor: 'rgba(12, 141, 233, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  const monthlyLabels = stats?.monthly_cases?.map((item) => item.month) || [];
  const monthlyPneumonia = stats?.monthly_cases?.map((item) => item.pneumonia) || [];
  const monthlyNormal = stats?.monthly_cases?.map((item) => item.normal) || [];

  const monthlyChartConfig = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Pneumonia Positive',
        data: monthlyPneumonia,
        borderColor: '#E63946',
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Normal Cases',
        data: monthlyNormal,
        borderColor: '#2A9D8F',
        backgroundColor: 'rgba(42, 157, 143, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 12 },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(226, 232, 240, 0.4)' }, beginAtZero: true },
    },
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-hospital-700 to-hospital-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-hospital-200 mb-2">
            Hospital Operations Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Clinical Decision Command Center</h1>
          <p className="text-xs md:text-sm text-hospital-100 mt-1">Real-time pneumonia detection metrics & patient case tracking.</p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/predict"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-hospital-800 hover:bg-hospital-50 rounded-xl font-bold text-sm shadow-md transition"
          >
            <Activity className="w-4 h-4" />
            <span>New Scan</span>
          </Link>
          <Link
            to="/patient/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-500 text-white rounded-xl font-bold text-sm shadow-md transition border border-white/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Patient</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Patients</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">{stats?.today_patients || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total Registered: {stats?.total_patients || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Positive Cases</span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-3">{stats?.positive_cases || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Pneumonia Detected</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Negative Cases</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-3">{stats?.negative_cases || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Normal Scans</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pending Reports</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-3">{stats?.pending_reports || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting PDF Generation</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-hospital-600 uppercase tracking-wider">Avg Confidence</span>
            <div className="p-2.5 bg-hospital-50 dark:bg-hospital-950 text-hospital-600 dark:text-hospital-400 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-hospital-600 dark:text-hospital-400 mt-3">{stats?.average_confidence || 0}%</p>
          <p className="text-xs text-slate-500 mt-1">Model Certainty</p>
        </div>
      </div>

      {/* Model Performance Metrics Strip */}
      {stats?.model_metrics?.metrics && (
        <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-hospital-600 rounded-xl">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Model Evaluation Metrics ({stats.model_metrics.version})</h3>
              <p className="text-xs text-slate-400">Validated on clinical chest X-ray evaluation dataset</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 text-center">
            <div>
              <p className="text-xs font-semibold text-slate-400">Accuracy</p>
              <p className="text-lg font-bold text-emerald-400">{(stats.model_metrics.metrics.accuracy * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Precision</p>
              <p className="text-lg font-bold text-blue-400">{(stats.model_metrics.metrics.precision * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Recall</p>
              <p className="text-lg font-bold text-purple-400">{(stats.model_metrics.metrics.recall * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">F1 Score</p>
              <p className="text-lg font-bold text-amber-400">{(stats.model_metrics.metrics.f1_score * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">ROC-AUC</p>
              <p className="text-lg font-bold text-cyan-400">{(stats.model_metrics.metrics.roc_auc * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Weekly Case Volume</h3>
              <p className="text-xs text-slate-500">Scan throughput over the last 7 days</p>
            </div>
            <TrendingUp className="w-5 h-5 text-hospital-600" />
          </div>
          <div className="h-64">
            <Bar data={weeklyChartConfig} options={chartOptions} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Monthly Diagnostic Trends</h3>
              <p className="text-xs text-slate-500">Comparison of Pneumonia vs Normal cases</p>
            </div>
            <Activity className="w-5 h-5 text-rose-500" />
          </div>
          <div className="h-64">
            <Line data={monthlyChartConfig} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Recent AI Diagnostic Predictions</h3>
            <p className="text-xs text-slate-500">Latest chest X-ray evaluations processed</p>
          </div>
          <Link
            to="/reports"
            className="text-xs font-bold text-hospital-600 dark:text-hospital-400 hover:underline flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {stats?.recent_predictions?.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No recent predictions found. Upload a scan to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Prediction</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {stats?.recent_predictions?.map((pred) => (
                  <tr key={pred.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{pred.patient_id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          pred.prediction === 'PNEUMONIA'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {pred.prediction === 'PNEUMONIA' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {pred.prediction}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{pred.confidence}%</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          pred.severity === 'High'
                            ? 'bg-rose-500 text-white'
                            : pred.severity === 'Medium'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {pred.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {pred.created_at ? new Date(pred.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/reports?predId=${pred.id}`}
                        className="p-1.5 inline-flex items-center gap-1 text-xs font-semibold text-hospital-600 dark:text-hospital-400 hover:bg-hospital-50 dark:hover:bg-hospital-950/50 rounded-lg transition"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Report</span>
                      </Link>
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

export default Dashboard;
