import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { Users, CheckCircle, Clock, XCircle, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminOverview = () => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch events on mount
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
          } else {
            setLoading(false);
          }
        } else {
          setError(data.message || 'Failed to fetch events');
          setLoading(false);
        }
      } catch (err) {
        setError('Error connecting to backend API');
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch stats when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/admin/reports/stats?eventId=${selectedEventId}`, {
          headers: authHeader()
        });
        const data = await response.json();
        if (response.ok) {
          setStats(data);
        } else {
          setError(data.message || 'Failed to fetch stats');
        }
      } catch (err) {
        setError('Error fetching statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedEventId]);

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500">Real-time attendance tracking and metrics</p>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Select Event:</span>
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
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No events found</h3>
          <p className="mt-2 text-sm text-gray-500">Get started by creating your first event</p>
          <div className="mt-6">
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-2 rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-ieee-dark transition"
            >
              Create Event <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Total Participants */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Registered Students</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-ieee-blue">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Verified */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Verified Attendance</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Verification</p>
                  <p className="mt-2 text-3xl font-bold text-amber-500">{stats.pending}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-amber-500">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Rejected */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Rejected Attendance</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-red-600">
                  <XCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

          </div>

          {/* Day Wise Metric Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Attendance Day-wise breakdown (Verified Only)</h3>
            <div className="grid gap-6 sm:grid-cols-3">
              {['Day 1', 'Day 2', 'Day 3'].map((day) => {
                const count = stats.dayStats[day] || 0;
                const percentage = stats.totalParticipants > 0 
                  ? Math.round((count / stats.totalParticipants) * 100) 
                  : 0;

                return (
                  <div key={day} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-500">{day} Attendance</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-full">{percentage}% Verified</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-gray-900">{count}</span>
                      <span className="text-sm text-gray-500">/ {stats.totalParticipants} students</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-4 overflow-hidden">
                      <div 
                        className="bg-ieee-blue h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                to="/admin/verification"
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Verify Pending Attendance</p>
                  <p className="text-xs text-slate-500 mt-1">Review live scans and ID matches</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>

              <Link
                to="/admin/upload"
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Import Participants</p>
                  <p className="text-xs text-slate-500 mt-1">Upload registration Excel file</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>

              <Link
                to="/admin/reports"
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Export Reports</p>
                  <p className="text-xs text-slate-500 mt-1">Download attendance logs as Excel</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default AdminOverview;
