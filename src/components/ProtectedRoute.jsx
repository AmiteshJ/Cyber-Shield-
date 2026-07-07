import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-cyber-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyber-neonCyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-cyber-neonCyan font-mono text-sm tracking-widest animate-pulse">VERIFYING CREDENTIALS...</p>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    return children;
};

export default ProtectedRoute;
