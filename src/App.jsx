import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import MalwareDetector from './pages/MalwareDetector';
import PhishingDetector from './pages/PhishingDetector';
import VulnerabilityPrioritizer from './pages/VulnerabilityPrioritizer';
import SecurityChatbot from './pages/SecurityChatbot';
import HoneypotLogs from './pages/HoneypotLogs';
import PolicyChatbot from './pages/PolicyChatbot';
import ProfilePage from './pages/ProfilePage';

// 🔥 NEW IMPORT
import SpamShield from './pages/SpamShield';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes with Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/malware" element={<MalwareDetector />} />
            <Route path="/phishing" element={<PhishingDetector />} />
            <Route path="/vulnerabilities" element={<VulnerabilityPrioritizer />} />
            <Route path="/chatbot" element={<SecurityChatbot />} />
            <Route path="/honeypot" element={<HoneypotLogs />} />
            <Route path="/policy" element={<PolicyChatbot />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* 🛡️ Spam Shield Route */}
            <Route path="/spam-shield" element={<SpamShield />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;