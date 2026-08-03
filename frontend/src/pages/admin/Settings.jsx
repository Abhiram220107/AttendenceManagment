import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

const Settings = () => {
  const { user, authHeader } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to change password.');
      }
    } catch (err) {
      setError('Server error changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Configure account preferences and security options</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Column: Account Profile Snapshot */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-ieee-blue">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">{user?.name || 'IEEE Admin'}</h3>
            <p className="text-xs text-gray-500 font-medium bg-slate-100 rounded-full px-2.5 py-0.5 mt-2 w-fit mx-auto capitalize">
              Role: {user?.role || 'admin'}
            </p>
            
            <div className="mt-6 border-t border-gray-150 pt-6 text-left space-y-3.5">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-gray-700">{user?.email || 'admin@ieee.org'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">System Access Scope</span>
                <span className="text-sm font-semibold text-gray-700">Full Administrative Control</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6">
              <KeyRound className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-bold text-gray-900">Change Account Password</h3>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-600 border border-green-100">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Retype new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-150 mt-6">
                <button
                  type="submit"
                  className="rounded-lg bg-ieee-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-ieee-dark focus:outline-none disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Settings;
