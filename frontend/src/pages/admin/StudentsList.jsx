import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { Search, QrCode, X, Printer, User } from 'lucide-react';

const StudentsList = () => {
  const { authHeader } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // QR Modal state
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/students`, {
          headers: authHeader()
        });
        const data = await response.json();
        if (response.ok) {
          setStudents(data);
        } else {
          setError(data.message || 'Failed to load students.');
        }
      } catch (err) {
        setError('Error connecting to backend API.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handlePrintQR = () => {
    const canvas = document.getElementById('student-qr-canvas');
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    const windowContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print QR Code - ${selectedStudent.name}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          .card { border: 2px solid #000; display: inline-block; padding: 30px; border-radius: 12px; }
          h2 { margin: 0 0 10px 0; }
          p { margin: 5px 0; color: #555; }
          img { margin: 20px 0; width: 250px; height: 250px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>${selectedStudent.name}</h2>
          <p>Registration No: <b>${selectedStudent.registrationNumber}</b></p>
          <p>Department: ${selectedStudent.department}</p>
          <img src="${dataUrl}" />
          <p>IEEE Attendance QR Code</p>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.open();
    printWindow.document.write(windowContent);
    printWindow.document.close();
  };

  // Filter students based on query
  const filteredStudents = students.filter(st => {
    const q = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.registrationNumber.toLowerCase().includes(q) ||
      st.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students List</h2>
          <p className="text-sm text-gray-500">View and manage registered student accounts</p>
        </div>
        
        {/* Search bar */}
        <div className="relative max-w-sm w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, reg number, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-ieee-blue focus:outline-none focus:ring-1 focus:ring-ieee-blue"
          />
        </div>
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
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No participants found.</h3>
          <p className="mt-2 text-sm text-gray-500">Please upload student lists or check import settings.</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No matching search results found.</h3>
          <p className="mt-2 text-sm text-gray-500">Try refining your search query.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Reg Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredStudents.map((st) => (
                <tr key={st.studentId} className="hover:bg-slate-50/55 transition">
                  <td className="whitespace-nowrap px-6 py-4 font-bold text-sm text-gray-900">{st.registrationNumber}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">{st.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{st.department}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{st.email || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => setSelectedStudent(st)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ieee-blue px-3 py-1.5 text-xs font-semibold text-ieee-blue hover:bg-blue-50 transition cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" /> View QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-600/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl transition duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Student QR Token</h3>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-6 text-center">
              <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedStudent.name}</h4>
              <p className="text-sm font-semibold text-gray-500">Reg No: {selectedStudent.registrationNumber}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selectedStudent.department}</p>
              
              {/* QR Code Canvas */}
              <div className="mt-6 border-4 border-slate-900 rounded-lg p-3 bg-white shadow-md">
                <QRCodeCanvas
                  id="student-qr-canvas"
                  value={selectedStudent.qrToken}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Secure QR Code reminder */}
              <p className="text-xs text-slate-400 mt-4 italic max-w-xs">
                Matches security token. Does not contain registration number.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
              <button
                onClick={handlePrintQR}
                className="flex items-center gap-1.5 rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ieee-dark focus:outline-none"
              >
                <Printer className="h-4 w-4" /> Print QR
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentsList;
