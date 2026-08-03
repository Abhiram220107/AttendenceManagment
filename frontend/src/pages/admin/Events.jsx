import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { Calendar, Plus, X, AlertCircle } from 'lucide-react';

const Events = () => {
  const { authHeader } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form State
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events`, {
        headers: authHeader()
      });
      const data = await response.json();
      if (response.ok) {
        setEvents(data);
      } else {
        setError(data.message || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!eventName.trim() || !startDate || !endDate) {
      setFormError('Please fill in all fields.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End Date cannot be before Start Date.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ eventName, startDate, endDate })
      });
      const data = await response.json();

      if (response.ok) {
        setModalOpen(false);
        // Clear form
        setEventName('');
        setStartDate('');
        setEndDate('');
        // Refresh event list
        fetchEvents();
      } else {
        setFormError(data.message || 'Failed to create event');
      }
    } catch (err) {
      setFormError('Server error creating event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
          <p className="text-sm text-gray-500">Create and manage your IEEE events</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-ieee-dark transition duration-250 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {/* Events List table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ieee-blue border-t-transparent"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No events created yet</h3>
          <p className="mt-2 text-sm text-gray-500">Get started by creating your first event</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Event Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Start Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">End Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Duration (Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {events.map((event) => (
                <tr key={event.eventId} className="hover:bg-slate-50/55 transition">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{event.eventName}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(event.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(event.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                      {event.daysCount} {event.daysCount === 1 ? 'Day' : 'Days'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Event Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-600/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl transition duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create New Event</h3>
              <button 
                onClick={() => setModalOpen(false)} 
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700">Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IEEE Workshop 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Events;
