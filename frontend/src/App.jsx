import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

// Import Pages
import Login from './pages/Login';
import AdminOverview from './pages/admin/AdminOverview';
import Events from './pages/admin/Events';
import UploadParticipants from './pages/admin/UploadParticipants';
import StudentsList from './pages/admin/StudentsList';
import VolunteersList from './pages/admin/VolunteersList';
import AttendanceVerification from './pages/admin/AttendanceVerification';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import StudentDashboard from './pages/student/StudentDashboard';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminOverview />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/events" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Events />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/upload" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <UploadParticipants />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <StudentsList />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/volunteers" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <VolunteersList />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/verification" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AttendanceVerification />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Settings />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />

          {/* Student Protected Dashboard */}
          <Route 
            path="/student/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Volunteer Protected Dashboard */}
          <Route 
            path="/volunteer/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['volunteer']}>
                <VolunteerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
