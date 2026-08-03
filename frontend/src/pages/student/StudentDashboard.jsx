import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, LogOut, CheckCircle, Clock, XCircle, FileWarning, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, logout, authHeader } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // QR Code Modal
  const [qrOpen, setQrOpen] = useState(false);
  
  // Settings Change Password inside dashboard
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/student/profile`, {
        headers: authHeader()
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
      } else {
        setError(data.message || 'Failed to fetch student profile.');
      }
    } catch (err) {
      setError('Error connecting to backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setSettingsError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError('Password must be at least 6 characters.');
      return;
    }

    setSettingsSubmitting(true);
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
        setSettingsSuccess(data.message || 'Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSettingsError(data.message || 'Failed to change password.');
      }
    } catch (err) {
      setSettingsError('Server error updating password.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-bold text-green-700 border border-green-150">
            <CheckCircle className="h-3 w-3" /> Verified
          </span>
        );
      case 'Pending Verification':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-150">
            <Clock className="h-3 w-3 animate-pulse" /> Pending Verification
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700 border border-red-150">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-150 px-2 py-1 text-xs font-bold text-gray-500 border border-gray-250">
            Absent
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 shadow-xs h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-ieee-blue text-white text-xs font-bold">
            IEEE
          </div>
          <span className="text-lg font-bold tracking-wider text-gray-800">Student Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer"
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
        
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {profile && (
          <>
            {/* Student Welcome Header Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">Welcome, {profile.name}!</h2>
                <p className="text-sm text-gray-500 font-semibold">Reg No: {profile.registrationNumber}</p>
                <p className="text-xs text-gray-400 font-semibold">Department: {profile.department}</p>
              </div>

              <div>
                <button
                  onClick={() => setQrOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ieee-blue px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-ieee-blue/20 hover:bg-ieee-dark transition cursor-pointer"
                >
                  <QrCode className="h-5 w-5" /> Show My QR Code
                </button>
              </div>
            </div>

            {/* Attendance Sections */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Registered Events & Attendance</h3>

              {profile.attendanceChecklist && profile.attendanceChecklist.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                  You are not registered in any active events.
                </div>
              ) : (
                <div className="space-y-6">
                  {profile.attendanceChecklist?.map((eventChecklist) => (
                    <div 
                      key={eventChecklist.eventId}
                      className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden"
                    >
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h4 className="font-bold text-gray-800 text-md">{eventChecklist.eventName}</h4>
                      </div>
                      
                      <div className="p-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                          {Object.entries(eventChecklist.attendance).map(([day, status]) => (
                            <div 
                              key={day} 
                              className="rounded-lg border border-gray-150 p-4 bg-slate-50 flex flex-col justify-between gap-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-500">{day}</span>
                                {getStatusBadge(status)}
                              </div>
                              
                              {/* Display Admin Remarks if rejected */}
                              {status === 'Rejected' && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-md border border-red-100 flex items-start gap-1">
                                  <FileWarning className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                                  <span>Admin remarks: Photo mismatched. Please contact coordinator.</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* QR Code Modal Drawer */}
      {qrOpen && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-600/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl transition duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Your Identity QR Code</h3>
              <button 
                onClick={() => setQrOpen(false)} 
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-6 text-center">
              <h4 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h4>
              <p className="text-sm font-semibold text-gray-500">Reg No: {profile.registrationNumber}</p>
              
              {/* QR Canvas */}
              <div className="mt-6 border-4 border-slate-900 rounded-lg p-3 bg-white shadow-md">
                <QRCodeCanvas
                  value={profile.qrToken}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <p className="text-xs text-slate-400 mt-4 max-w-xs leading-relaxed">
                Present this QR code to the volunteer scanner to record your daily attendance.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-150">
              <button
                onClick={() => setQrOpen(false)}
                className="w-full rounded-lg bg-ieee-blue py-2.5 text-sm font-bold text-white hover:bg-ieee-dark focus:outline-none cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-600/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl transition duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <button 
                onClick={() => setSettingsOpen(false)} 
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {settingsError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs font-semibold text-green-600 border border-green-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                  disabled={settingsSubmitting}
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
                  disabled={settingsSubmitting}
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
                  disabled={settingsSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
                  disabled={settingsSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ieee-dark focus:outline-none disabled:bg-gray-400"
                  disabled={settingsSubmitting}
                >
                  {settingsSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-250 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} IEEE Attendance Management System. All rights reserved.
      </footer>

    </div>
  );
};

export default StudentDashboard;
