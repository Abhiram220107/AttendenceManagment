import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react';

const AttendanceVerification = () => {
  const { authHeader } = useAuth();
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Verification workspace state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verification/pending`, {
        headers: authHeader()
      });
      const data = await response.json();
      if (response.ok) {
        setPendingRecords(data);
      } else {
        setError(data.message || 'Failed to fetch pending attendance logs.');
      }
    } catch (err) {
      setError('Error connecting to backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerifyAction = async (status) => {
    if (!selectedRecord) return;
    setActionError('');
    setVerifying(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/verification/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          attendanceId: selectedRecord.attendanceId,
          status,
          remarks
        })
      });
      const data = await response.json();

      if (response.ok) {
        setSelectedRecord(null);
        setRemarks('');
        fetchPending(); // Refresh list
      } else {
        setActionError(data.message || 'Failed to process verification.');
      }
    } catch (err) {
      setActionError('Server error processing verification.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Verification</h2>
          <p className="text-sm text-gray-500">Perform manual verification of submitted volunteer scans</p>
        </div>
        <button
          onClick={fetchPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh List
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
        </div>
      ) : pendingRecords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No pending records</h3>
          <p className="mt-2 text-sm text-gray-500">All scanned attendance records are currently verified or processed.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* List of pending records */}
          <div className={`rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden ${selectedRecord ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">Pending Review Queue ({pendingRecords.length})</h3>
            </div>
            <div className="divide-y divide-gray-200 overflow-y-auto max-h-[600px]">
              {pendingRecords.map((rec) => (
                <div
                  key={rec.attendanceId}
                  onClick={() => {
                    setSelectedRecord(rec);
                    setRemarks('');
                    setActionError('');
                  }}
                  className={`flex items-center justify-between p-4 cursor-pointer transition hover:bg-slate-50 ${selectedRecord?.attendanceId === rec.attendanceId ? 'bg-blue-50/50 hover:bg-blue-50/70 border-l-4 border-ieee-blue' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{rec.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Reg: {rec.registrationNumber} • {rec.department}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded-sm w-fit truncate">
                      {rec.eventName} - {rec.day}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-slate-400 shrink-0 ml-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Verification Workspace Side-by-side */}
          {selectedRecord && (
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-md flex flex-col justify-between h-fit animate-pulse-subtle">
              
              <div>
                {/* Workspace Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Verification Console</h3>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition"
                  >
                    Close Console
                  </button>
                </div>

                {actionError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Split panels details */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Left panel: student details */}
                  <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-2">Student Metadata</h4>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Student Name</p>
                      <p className="text-md font-bold text-gray-900">{selectedRecord.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Registration Number</p>
                      <p className="text-md font-bold text-slate-800">{selectedRecord.registrationNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Department</p>
                      <p className="text-sm font-semibold text-gray-700">{selectedRecord.department}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-gray-500 font-medium">Event Scope</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedRecord.eventName}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedRecord.day}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <p>Scanned on: {new Date(selectedRecord.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Right panel: Images previews */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Photo Records</h4>
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Face photo */}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 mb-1">Face Photo</span>
                        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-3/4 hover:shadow-lg transition">
                          <img
                            src={selectedRecord.facePhotoURL.startsWith('/') ? `http://localhost:5000${selectedRecord.facePhotoURL}` : selectedRecord.facePhotoURL}
                            alt="Student Face"
                            className="w-full h-full object-cover cursor-zoom-in"
                            onClick={() => window.open(selectedRecord.facePhotoURL.startsWith('/') ? `http://localhost:5000${selectedRecord.facePhotoURL}` : selectedRecord.facePhotoURL, '_blank')}
                          />
                        </div>
                      </div>

                      {/* ID photo */}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 mb-1">ID Card Photo</span>
                        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-3/4 hover:shadow-lg transition">
                          <img
                            src={selectedRecord.idPhotoURL.startsWith('/') ? `http://localhost:5000${selectedRecord.idPhotoURL}` : selectedRecord.idPhotoURL}
                            alt="Student ID Card"
                            className="w-full h-full object-cover cursor-zoom-in"
                            onClick={() => window.open(selectedRecord.idPhotoURL.startsWith('/') ? `http://localhost:5000${selectedRecord.idPhotoURL}` : selectedRecord.idPhotoURL, '_blank')}
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Verification Guidance Alerts */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-800 mt-6 leading-relaxed">
                  <span className="font-bold">Manual Audit Checklist:</span> Match registration number on ID card, spelling of name on ID card, live face photo matching, and card face picture alignment.
                </div>

                {/* Remarks text area */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700">Remarks / Decline Reason</label>
                  <textarea
                    rows="2"
                    placeholder="Enter verification notes or reasons for rejection..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                    disabled={verifying}
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-6">
                <button
                  onClick={() => handleVerifyAction('Rejected')}
                  disabled={verifying}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-700 transition disabled:bg-gray-400"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => handleVerifyAction('Verified')}
                  disabled={verifying}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition disabled:bg-gray-400"
                >
                  <CheckCircle2 className="h-4 w-4" /> Verify
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default AttendanceVerification;
