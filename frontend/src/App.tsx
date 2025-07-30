import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contacts = lazy(() => import('./pages/Contacts'));
const ContactDetail = lazy(() => import('./pages/ContactDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const CustomFields = lazy(() => import('./pages/CustomFields'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Automations = lazy(() => import('./pages/Automations'));
const AutomationBuilder = lazy(() => import('./pages/AutomationBuilder'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="contacts/:id" element={<ContactDetail />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="automations" element={<Automations />} />
              <Route path="automations/:id" element={<AutomationBuilder />} />
              <Route path="automations/workflow/:id" element={<WorkflowBuilder />} />
              <Route path="profile" element={<Profile />} />
              <Route path="custom-fields" element={<CustomFields />} />
            </Route>
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;