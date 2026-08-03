import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadParticipants = () => {
  const { authHeader } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importedStudents, setImportedStudents] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setSuccess('');
      setImportedStudents([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setImportedStudents([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/participants/upload`, {
        method: 'POST',
        headers: authHeader(),
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setImportedStudents(data.imported || []);
        setFile(null);
      } else {
        setError(data.message || 'Failed to upload participants.');
      }
    } catch (err) {
      setError('Server error during Excel upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Participants</h2>
        <p className="text-sm text-gray-500">Import student registration lists directly from Excel spreadsheets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* File selector form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <form onSubmit={handleUpload} className="space-y-6">
              
              {/* Drag and Drop Container */}
              <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                <input
                  type="file"
                  id="excelFile"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  disabled={loading}
                />
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm font-semibold text-gray-700">
                  {file ? file.name : 'Click to upload or drag & drop Excel file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Supported formats: .xlsx, .xls</p>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 animate-pulse-subtle">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-600 border border-green-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  <p className="font-semibold">{success}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="flex items-center gap-2 rounded-lg bg-ieee-blue px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-ieee-dark focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Import Participants
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* List of imported students */}
          {importedStudents.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Successfully Imported ({importedStudents.length})</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Reg Number</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {importedStudents.map((st, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-semibold text-gray-900">{st.registrationNumber}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">{st.name}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">{st.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Documentation / Excel Format Guide Sidebar */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs h-fit">
          <h3 className="text-md font-bold text-gray-900 border-b border-gray-200 pb-3">Excel Template Specifications</h3>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            The importer requires the spreadsheet to contain a header row at the top. The mapping handles capitalization variations automatically.
          </p>
          <div className="mt-6 space-y-4">
            <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Required Columns</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Registration Number</p>
                  <p className="text-xs text-gray-500">Used as the student's unique login username</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Name</p>
                  <p className="text-xs text-gray-500">Student's full name</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Department</p>
                  <p className="text-xs text-gray-500">Department or major identifier</p>
                </div>
              </li>
            </ul>
            <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase pt-4 border-t border-gray-150">Optional Columns</h4>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">4</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">Email</p>
                <p className="text-xs text-gray-500">Contact email address (optional)</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default UploadParticipants;
