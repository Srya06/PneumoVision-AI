import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-full">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">404 — Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md">
        The requested clinical page or resource could not be found. Please check the URL or return to the main dashboard.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-3 bg-hospital-600 hover:bg-hospital-500 text-white font-bold rounded-xl text-sm shadow-md transition mt-2"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

export default NotFound;
