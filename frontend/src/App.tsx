import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Profile from './pages/Profile';
import CustomFields from './pages/CustomFields';
import Pipeline from './pages/Pipeline';
import Automations from './pages/Automations';
import AutomationBuilder from './pages/AutomationBuilder';
import WorkflowBuilder from './pages/WorkflowBuilder';

function App() {
  return (
    <Router>
      <AuthProvider>
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
      </AuthProvider>
    </Router>
  );
}

export default App;