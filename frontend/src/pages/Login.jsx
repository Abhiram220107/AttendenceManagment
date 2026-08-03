import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      // Redirect based on role
      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.role === 'volunteer') {
        navigate('/volunteer/dashboard');
      } else if (data.role === 'student') {
        navigate('/student/dashboard');
      } else {
        setError('Unknown user role. Contact administrator.');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-800 to-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-2xl transition duration-300 hover:shadow-slate-700/30">
        
        {/* Branding header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-ieee-blue text-white shadow-lg">
            <span className="text-xl font-bold tracking-wider">IEEE</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">Event Attendance</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to access your dashboard
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            
            {/* Username / Reg Number / Email field */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                Registration Number / Email
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue sm:text-sm"
                  placeholder="e.g. 2026CS01 / admin@ieee.org"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue sm:text-sm"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-ieee-blue py-3 px-4 text-sm font-bold text-white transition hover:bg-ieee-dark focus:outline-none focus:ring-2 focus:ring-ieee-blue focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Guidelines info */}
          <div className="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-500">
            <span className="font-semibold">Students:</span> Username is Registration Number, Password is Student@123 by default.
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;
