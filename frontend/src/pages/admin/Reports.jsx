import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { FileSpreadsheet, BarChart3, Search, Download, AlertCircle } from 'lucide-react';

const Reports = () => {
  const { authHeader } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stats, setStats] = useState({
    totalParticipants: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    dayStats: {}
  });
  
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch events and students on mount
  useEffect(() => {
    const initPage = async () => {
      try {
        // Fetch events
        const evResponse = await fetch(`${API_BASE_URL}/admin/events`, {
          headers: authHeader()
        });
        const evData = await evResponse.json();
        
        // Fetch students
        const stResponse = await fetch(`${API_BASE_URL}/admin/students`, {
          headers: authHeader()
        });
        const stData = await stResponse.json();

        if (evResponse.ok && stResponse.ok) {
          setEvents(evData);
          setStudents(stData);
          if (evData.length > 0) {
            setSelectedEventId(evData[0].eventId);
          } else {
            setLoading(false);
          }
        } else {
          setError('Failed to fetch initial configuration.');
          setLoading(false);
        }
      } catch (err) {
        setError('Error connecting to backend API.');
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // Fetch stats and attendance logs when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchEventData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch stats
        const statsResponse = await fetch(`${API_BASE_URL}/admin/reports/stats?eventId=${selectedEventId}`, {
          headers: authHeader()
        });
        const statsData = await statsResponse.json();

        // Fetch attendance records
        const attResponse = await fetch(`${API_BASE_URL}/admin/attendance?eventId=${selectedEventId}`, {
          headers: authHeader()
        });
        const attData = await attResponse.json();

        if (statsResponse.ok && attResponse.ok) {
          setStats(statsData);
          setAttendance(attData);
        } else {
          setError(statsData.message || 'Failed to fetch event reports.');
        }
      } catch (err) {
        setError('Error fetching reports data.');
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [selectedEventId]);

  const handleExport = async () => {
    if (!selectedEventId) return;
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/export?eventId=${selectedEventId}`, {
        headers: authHeader()
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IEEE_Attendance_Report_${selectedEventId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export Excel report.');
    } finally {
      setExporting(false);
    }
  };

  // Build attendance lookup dictionary (studentId -> day -> status)
  const attendanceMap = {};
  attendance.forEach((rec) => {
    if (!attendanceMap[rec.studentId]) {
      attendanceMap[rec.studentId] = {};
    }
    attendanceMap[rec.studentId][rec.day] = rec.status;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Verified':
        return 'bg-green-50 text-green-700 border border-green-150 font-bold';
      case 'Pending Verification':
        return 'bg-amber-50 text-amber-700 border border-amber-150 font-bold';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border border-red-150 font-bold';
      default:
        return 'bg-gray-50 text-gray-400 border border-gray-150';
    }
  };

  const filteredStudents = students.filter((st) => {
    const q = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.registrationNumber.toLowerCase().includes(q)
    );
  });

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Reports</h2>
          <p className="text-sm text-gray-500">View attendance summaries and export spreadsheet logs</p>
        </div>

        {events.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm shadow-xs focus:border-ieee-blue focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.eventName}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition cursor-pointer disabled:bg-gray-400"
            >
              {exporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Export to Excel
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No reports available</h3>
          <p className="mt-2 text-sm text-gray-500">Create an event and upload students to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Stats quick card deck */}
          <div className="grid gap-6 sm:grid-cols-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-center sm:border-r border-gray-250 last:border-none p-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Participants</span>
              <span className="text-3xl font-extrabold text-slate-800 mt-2 block">{stats.totalParticipants}</span>
            </div>
            <div className="text-center sm:border-r border-gray-250 last:border-none p-2">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider block">Verified</span>
              <span className="text-3xl font-extrabold text-green-600 mt-2 block">{stats.verified}</span>
            </div>
            <div className="text-center sm:border-r border-gray-250 last:border-none p-2">
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider block">Pending</span>
              <span className="text-3xl font-extrabold text-amber-500 mt-2 block">{stats.pending}</span>
            </div>
            <div className="text-center p-2">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block">Rejected</span>
              <span className="text-3xl font-extrabold text-red-600 mt-2 block">{stats.rejected}</span>
            </div>
          </div>

          {/* Student Detailed attendance matrix */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="font-bold text-gray-800">Detailed Student Attendance Record</h3>
              
              <div className="relative max-w-xs w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or reg number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No students match the search filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Reg Number</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Student Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Department</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Day 1</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Day 2</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Day 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredStudents.map((st) => {
                      const studentAtt = attendanceMap[st.studentId] || {};
                      const day1Status = studentAtt['Day 1'] || 'Absent';
                      const day2Status = studentAtt['Day 2'] || 'Absent';
                      const day3Status = studentAtt['Day 3'] || 'Absent';

                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/55 transition">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">{st.registrationNumber}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">{st.name}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{st.department}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(day1Status)}`}>
                              {day1Status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(day2Status)}`}>
                              {day2Status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(day3Status)}`}>
                              {day3Status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
};

export default Reports;
