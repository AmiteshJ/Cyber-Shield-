import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MalwareDetector from './pages/MalwareDetector';
import PhishingDetector from './pages/PhishingDetector';
import VulnerabilityPrioritizer from './pages/VulnerabilityPrioritizer';
import SecurityChatbot from './pages/SecurityChatbot';
import HoneypotLogs from './pages/HoneypotLogs';
import PolicyChatbot from './pages/PolicyChatbot';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page has no Sidebar typically, or a different layout */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard Pages with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/malware" element={<MalwareDetector />} />
          <Route path="/phishing" element={<PhishingDetector />} />
          <Route path="/vulnerabilities" element={<VulnerabilityPrioritizer />} />
          <Route path="/chatbot" element={<SecurityChatbot />} />
          <Route path="/honeypot" element={<HoneypotLogs />} />
          <Route path="/policy" element={<PolicyChatbot />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
