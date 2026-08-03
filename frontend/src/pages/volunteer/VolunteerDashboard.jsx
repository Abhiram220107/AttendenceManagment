import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import QRScanner from '../../components/QRScanner';
import CameraCapture from '../../components/CameraCapture';
import { 
  LogOut, 
  Scan, 
  UserCheck2, 
  Image, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VolunteerDashboard = () => {
  const { user, logout, authHeader } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedDay, setSelectedDay] = useState('Day 1');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState('');

  // Workflow states
  const [scanning, setScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);
  const [facePhoto, setFacePhoto] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  
  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password change modal
  const [passOpen, setPassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Fetch events list on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/events`, {
          headers: authHeader()
        });
        const data = await response.json();
        if (response.ok) {
          setEvents(data);
          if (data.length > 0) {
            setSelectedEventId(data[0].eventId);
          }
        } else {
          setError(data.message || 'Failed to fetch events.');
        }
      } catch (err) {
        setError('Error connecting to backend API.');
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQRScanSuccess = async (qrToken) => {
    setError('');
    setSuccessMsg('');
    setScannedStudent(null);
    setFacePhoto(null);
    setIdPhoto(null);

    try {
      const response = await fetch(`${API_BASE_URL}/volunteer/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ qrToken })
      });
      const data = await response.json();

      if (response.ok) {
        setScannedStudent(data);
        setScanning(false);
      } else {
        setError(data.message || 'Invalid QR Code. Student record not found.');
      }
    } catch (err) {
      setError('Server error checking QR Token.');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!scannedStudent || !selectedEventId || !selectedDay || !facePhoto || !idPhoto) {
      setError('Please capture both Face and ID photos before submitting.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/volunteer/submit-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          studentId: scannedStudent.studentId,
          eventId: selectedEventId,
          day: selectedDay,
          facePhoto,
          idPhoto
        })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`Attendance submitted successfully for ${scannedStudent.name}!`);
        // Reset scanned student context
        setScannedStudent(null);
        setFacePhoto(null);
        setIdPhoto(null);
      } else {
        setError(data.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      setError('Server error submitting attendance logs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPassError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
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
        setPassSuccess('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(data.message || 'Failed to update password.');
      }
    } catch (err) {
      setPassError('Server error.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeEvent = events.find(e => e.eventId === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 shadow-xs h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-ieee-blue text-white text-xs font-bold">
            IEEE
          </div>
          <span className="text-lg font-bold tracking-wider text-gray-800">Volunteer Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setPassOpen(true)}
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

      {/* Main content body */}
      <main className="flex-1 p-6 md:p-8 max-w-3xl w-full mx-auto space-y-6">
        
        {/* Step 1: Configuration Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-2.5">
            <FolderOpen className="h-5 w-5 text-ieee-blue animate-pulse-subtle" />
            <h3 className="text-md font-bold text-gray-850">Select Scope</h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Target Event</label>
              {loadingEvents ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse mt-1"></div>
              ) : events.length === 0 ? (
                <select className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm" disabled>
                  <option>No events created by admin</option>
                </select>
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setScannedStudent(null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none"
                >
                  {events.map(ev => (
                    <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Active Day</label>
              <select
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setScannedStudent(null);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none"
              >
                {activeEvent?.days ? activeEvent.days.map((day) => (
                  <option key={day} value={day}>{day}</option>
                )) : (
                  <>
                    <option value="Day 1">Day 1</option>
                    <option value="Day 2">Day 2</option>
                    <option value="Day 3">Day 3</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600 border border-green-100 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 2: Trigger Scanning */}
        {!scanning && !scannedStudent && (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-300 bg-white">
            <Scan className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-pulse-subtle" />
            <h4 className="text-lg font-bold text-gray-800">Scan Student QR Code</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto px-4">
              Open the scanner using the device camera to identify and load student profiles automatically.
            </p>
            <button
              onClick={() => {
                setScanning(true);
                setError('');
                setSuccessMsg('');
              }}
              disabled={events.length === 0}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ieee-blue px-6 py-3 text-sm font-bold text-white shadow-lg shadow-ieee-blue/20 hover:bg-ieee-dark transition cursor-pointer disabled:bg-gray-400"
            >
              <Scan className="h-4 w-4" /> Open QR Scanner
            </button>
          </div>
        )}

        {/* Live scanning console */}
        {scanning && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <QRScanner
              onScan={handleQRScanSuccess}
              onClose={() => setScanning(false)}
            />
          </div>
        )}

        {/* Step 3: Scanned student dashboard and camera workspace */}
        {scannedStudent && (
          <div className="space-y-6">
            
            {/* Student metadata panel */}
            <div className="rounded-xl bg-slate-900 text-white p-6 shadow-md relative overflow-hidden">
              <button 
                onClick={() => setScannedStudent(null)} 
                className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800 pb-2">
                <UserCheck2 className="h-5 w-5 text-green-400" />
                <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider">Student Identified</h4>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Full Name</span>
                  <span className="text-md font-bold truncate block">{scannedStudent.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Registration Number</span>
                  <span className="text-md font-bold tracking-wider block">{scannedStudent.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Department / Major</span>
                  <span className="text-md font-bold truncate block">{scannedStudent.department}</span>
                </div>
              </div>
            </div>

            {/* Split screen photo capture boxes */}
            <div className="grid gap-6 md:grid-cols-2">
              <CameraCapture
                label="Step 1: Capture Face Photo"
                onCapture={setFacePhoto}
              />
              <CameraCapture
                label="Step 2: Capture ID Card Photo"
                onCapture={setIdPhoto}
              />
            </div>

            {/* Submit Attendance */}
            <div className="flex justify-end pt-4 border-t border-gray-250">
              <button
                onClick={handleSubmitAttendance}
                disabled={submitting || !facePhoto || !idPhoto}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Submitting logs...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Attendance
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Password Modal */}
      {passOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-600/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl transition duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <button 
                onClick={() => setPassOpen(false)} 
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs font-semibold text-green-600 border border-green-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <span>{passSuccess}</span>
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setPassOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ieee-dark focus:outline-none disabled:bg-gray-400"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-255 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} IEEE Attendance Management System. All rights reserved.
      </footer>

    </div>
  );
};

export default VolunteerDashboard;
