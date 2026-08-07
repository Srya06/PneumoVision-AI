import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { UserPlus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const COMMON_SYMPTOMS = [
  'Cough (Productive)',
  'High Fever',
  'Shortness of Breath',
  'Chest Pain',
  'Fatigue & Chills',
  'Wheezing',
  'Loss of Appetite',
  'Hemoptysis',
];

const PatientRegistration = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { gender: 'Male' },
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        age: parseInt(data.age, 10),
        gender: data.gender,
        phone: data.phone.trim(),
        address: data.address ? data.address.trim() : '',
        medical_history: data.medical_history ? data.medical_history.trim() : '',
        symptoms: selectedSymptoms,
      };

      const res = await api.post('/patient/create', payload);
      toast.success(`Patient registered! ID: ${res.data.patient_id}`);
      navigate(`/predict?patient_id=${res.data.patient_id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Failed to register patient.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        // Pydantic validation errors
        msg = detail.map((e) => e.msg || e.message).join(' | ');
      } else if (err.response?.data?.errors) {
        msg = err.response.data.errors.map((e) => e.message).join(' | ');
      } else if (!err.response) {
        msg = 'Cannot reach server. Make sure the backend is running on port 8000.';
      }
      toast.error(msg, { duration: 6000 });
      console.error('Patient registration error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Register New Patient</h1>
          <p className="text-xs text-slate-500">Create a clinical file prior to X-ray scanning</p>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Eleanor Vance"
              {...register('full_name', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
              })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
            {errors.full_name && (
              <p className="text-xs text-rose-500 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              placeholder="patient@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email address' },
              })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Age *
            </label>
            <input
              type="number"
              placeholder="45"
              {...register('age', {
                required: 'Age is required',
                min: { value: 0, message: 'Age cannot be negative' },
                max: { value: 150, message: 'Age cannot exceed 150' },
              })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
            {errors.age && (
              <p className="text-xs text-rose-500 mt-1">{errors.age.message}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Gender *
            </label>
            <select
              {...register('gender', { required: 'Gender is required' })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && (
              <p className="text-xs text-rose-500 mt-1">{errors.gender.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 019-2834"
              {...register('phone', {
                required: 'Phone number is required',
                minLength: { value: 7, message: 'Phone must be at least 7 digits' },
                maxLength: { value: 20, message: 'Phone cannot exceed 20 characters' },
              })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
            {errors.phone && (
              <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Residential Address
            </label>
            <input
              type="text"
              placeholder="123 Health Ave, Suite 400"
              {...register('address')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>
        </div>

        {/* Presenting Symptoms Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Presenting Symptoms
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom);
              return (
                <button
                  type="button"
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-hospital-600 text-white border-hospital-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-hospital-400'
                  }`}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
          {selectedSymptoms.length > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Medical History */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Medical &amp; Clinical History
          </label>
          <textarea
            rows={3}
            placeholder="Prior respiratory conditions, smoking history, asthma, immunosuppression..."
            {...register('medical_history')}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-hospital-500 outline-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-hospital-600 hover:bg-hospital-500 text-white font-bold rounded-xl text-sm shadow-md shadow-hospital-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register &amp; Proceed to Scan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;
