import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import InteractionChecker from './pages/InteractionChecker';
import Copilot from './pages/Copilot';
import SymptomLogger from './pages/SymptomLogger';
import LabResults from './pages/LabResults';
import AppointmentPrep from './pages/AppointmentPrep';
import PatientProfile from './pages/PatientProfile';
import DailyCheckIn from './pages/DailyCheckIn';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="medications" element={<Medications />} />
        <Route path="interactions" element={<InteractionChecker />} />
        <Route path="copilot" element={<Copilot />} />
        <Route path="symptoms" element={<SymptomLogger />} />
        <Route path="lab-results" element={<LabResults />} />
        <Route path="appointments" element={<AppointmentPrep />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="check-in" element={<DailyCheckIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
