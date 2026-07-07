import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('cybershield_user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        const u = { ...userData, loginTime: new Date().toISOString() };
        localStorage.setItem('cybershield_user', JSON.stringify(u));
        setUser(u);
    };

    const signup = (userData) => {
        const users = JSON.parse(localStorage.getItem('cybershield_users') || '[]');

        const exists = users.find(u => u.email === userData.email);
        if (exists) throw new Error('Account already exists with this email');

        const newUser = {
            id: Date.now().toString(),
            ...userData,
            createdAt: new Date().toISOString(),
            role: 'Analyst',
            clearanceLevel: 'LEVEL-2',
            avatar: userData.name?.slice(0, 2).toUpperCase() || 'CS',
            scansRun: 0,
            threatsBlocked: 0,

            // 🔐 NEW FEATURE: 2FA default OFF
            twoFAEnabled: false,
        };

        users.push(newUser);
        localStorage.setItem('cybershield_users', JSON.stringify(users));

        login(newUser);
    };

    const logout = () => {
        localStorage.removeItem('cybershield_user');
        setUser(null);
    };

    const updateProfile = (updates) => {
        const updated = { ...user, ...updates };

        // Update current session
        localStorage.setItem('cybershield_user', JSON.stringify(updated));

        // Update users list
        const users = JSON.parse(localStorage.getItem('cybershield_users') || '[]');
        const idx = users.findIndex(u => u.id === user.id);

        if (idx !== -1) {
            users[idx] = { ...users[idx], ...updates };
            localStorage.setItem('cybershield_users', JSON.stringify(users));
        }

        setUser(updated);
    };

    // 🔐 NEW FEATURE: Check 2FA before login flow
    const is2FAEnabled = (email) => {
        const users = JSON.parse(localStorage.getItem('cybershield_users') || '[]');
        const found = users.find(u => u.email === email);
        return found?.twoFAEnabled === true;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                signup,
                logout,
                updateProfile,
                is2FAEnabled // 🔥 exposed for login flow
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};