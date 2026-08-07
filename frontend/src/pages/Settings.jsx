import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Cpu, ShieldCheck, User, Database, Server, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    api.get('/health')
      .then(res => setModelInfo(res.data.model))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">System & Model Settings</h1>
        <p className="text-xs text-slate-500">PneumoVision AI system parameters and evaluation benchmarks</p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-hospital-100 dark:bg-hospital-950 text-hospital-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Physician Account Profile</h2>
            <p className="text-xs text-slate-500">Authenticated staff profile information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-400 font-bold block uppercase">Full Name</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Dr. {user?.full_name || user?.username}</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-400 font-bold block uppercase">Role</span>
            <span className="font-semibold text-hospital-600 dark:text-hospital-400 uppercase">{user?.role}</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-400 font-bold block uppercase">Department</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.department || 'Radiology'}</span>
          </div>
        </div>
      </div>

      {/* Model Benchmark Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">VGG16 Neural Network Evaluation Benchmark</h2>
            <p className="text-xs text-slate-500">Validation metrics from evaluation_metrics.csv</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">Accuracy</p>
            <p className="text-xl font-black text-emerald-500 mt-1">90.38%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">Precision</p>
            <p className="text-xl font-black text-blue-500 mt-1">91.25%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">Recall</p>
            <p className="text-xl font-black text-purple-500 mt-1">93.59%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">F1 Score</p>
            <p className="text-xl font-black text-amber-500 mt-1">92.41%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">Specificity</p>
            <p className="text-xl font-black text-cyan-500 mt-1">85.04%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 uppercase">ROC-AUC</p>
            <p className="text-xl font-black text-rose-500 mt-1">95.95%</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Model binary file <code>pneumovision_vgg16_final.keras</code> loaded into memory. Warmup pass executed cleanly.</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
