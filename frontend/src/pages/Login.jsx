import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Lock, User, Shield, Activity, ArrowRight, Heart, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [loginRole, setLoginRole] = useState('doctor'); // 'doctor' | 'admin'
  const [username, setUsername] = useState('dr_smith');
  const [password, setPassword] = useState('Doctor@123');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const switchRole = (role) => {
    setLoginRole(role);
    if (role === 'doctor') {
      setUsername('dr_smith');
      setPassword('Doctor@123');
    } else {
      setUsername('admin_head');
      setPassword('Admin@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role === 'admin') {
        navigate('/admin/doctors');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Make sure the backend server is running.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = loginRole === 'admin';

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-white font-sans overflow-hidden">

      {/* ── Left Hero Panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-hospital-900 via-hospital-950 to-slate-950 flex-col justify-between p-14 relative overflow-hidden border-r border-slate-800/60">

        {/* Animated glow orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-hospital-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-hospital-700/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-hospital-600/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3.5 bg-hospital-600 rounded-2xl shadow-2xl shadow-hospital-600/50 ring-1 ring-hospital-400/30">
            <Stethoscope className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">PneumoVision AI</h1>
            <p className="text-xs text-hospital-300 font-semibold tracking-widest uppercase mt-0.5">Clinical Decision Support System</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8 max-w-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-hospital-500/20 text-hospital-300 border border-hospital-500/30 mb-5">
              <Zap className="w-3.5 h-3.5 text-hospital-400" />
              <span>VGG16 Fine-Tuned Neural Network</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight leading-none text-white mb-4">
              AI-Powered<br />
              <span className="text-hospital-400">Pneumonia</span><br />
              Detection
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Upload chest X-ray images and receive instant AI analysis with Grad-CAM visual heatmaps,
              severity classification, clinical recommendations, and professional PDF reports — all in seconds.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '90.4%', label: 'Accuracy', color: 'text-hospital-400' },
              { value: '0.959', label: 'ROC-AUC', color: 'text-emerald-400' },
              { value: '< 2s', label: 'Inference', color: 'text-amber-400' },
            ].map((m) => (
              <div key={m.label} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="space-y-2.5">
            {[
              'Real-time pneumonia detection from X-ray images',
              'Grad-CAM heatmap visualization of AI attention',
              'Patient management & full prediction history',
              'Downloadable PDF clinical reports',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-hospital-600/30 border border-hospital-500/40 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-hospital-400" />
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center border-t border-slate-800/60 pt-5 text-xs text-slate-500">
          <span>© 2026 PneumoVision AI Systems</span>
          <div className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-rose-500" />
            <span>HIPAA-Compliant Healthcare AI</span>
          </div>
        </div>
      </div>

      {/* ── Right Login Panel ───────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-14">
        <div className="w-full max-w-sm space-y-7">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-hospital-600 rounded-xl shadow-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white">PneumoVision AI</h1>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl font-black text-white">
              {isAdmin ? 'Admin Console' : 'Physician Portal'}
            </h2>
            <p className="text-sm text-slate-400 mt-1.5">
              {isAdmin
                ? 'Manage doctors, monitor system health, and oversee hospital operations.'
                : 'Sign in to access AI diagnostics, patient records, and clinical reports.'}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="flex bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 gap-1">
            <button
              type="button"
              onClick={() => switchRole('doctor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                !isAdmin
                  ? 'bg-hospital-600 text-white shadow-lg shadow-hospital-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                isAdmin
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                Username
              </label>
              <div className="relative">
                <User className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isAdmin ? 'admin_head' : 'dr_smith'}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-transparent transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg text-white flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                isAdmin
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/25 hover:shadow-purple-600/40'
                  : 'bg-hospital-600 hover:bg-hospital-500 shadow-hospital-600/25 hover:shadow-hospital-600/40'
              }`}
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {isAdmin ? 'Admin Console' : 'Physician Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Default Credentials Info */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            isAdmin
              ? 'bg-purple-950/30 border-purple-800/40'
              : 'bg-hospital-950/30 border-hospital-800/40'
          }`}>
            <p className="font-bold text-slate-300 uppercase tracking-wider">
              {isAdmin ? '🛡️ Default Admin Credentials' : '👨‍⚕️ Default Doctor Credentials'}
            </p>
            <div className="font-mono text-slate-400 space-y-1">
              <p>Username: <span className="text-white">{isAdmin ? 'admin_head' : 'dr_smith'}</span></p>
              <p>Password: <span className="text-white">{isAdmin ? 'Admin@123' : 'Doctor@123'}</span></p>
            </div>
            {!isAdmin && (
              <p className="text-slate-500 mt-1 pt-1 border-t border-slate-800">
                💡 Doctors are added by the admin. Contact your hospital administrator for access.
              </p>
            )}
          </div>

          <p className="text-center text-xs text-slate-600">
            PneumoVision AI v1.0 · Secured with JWT · HIPAA Compliant
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
