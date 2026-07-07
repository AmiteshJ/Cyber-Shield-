import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Shield,
    Activity,
    Settings,
    LogOut,
    Edit3,
    Save,
    X,
    Lock,
    CheckCircle,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ── 2FA Toggle Component ──
const TwoFAToggle = ({ user, updateProfile }) => {
    const [toggling, setToggling] = useState(false);
    const [confirmOff, setConfirmOff] = useState(false);

    const enabled = user?.twoFAEnabled === true;

    const handleToggle = async () => {
        if (enabled) {
            setConfirmOff(true);
            return;
        }

        setToggling(true);
        await new Promise((r) => setTimeout(r, 400));
        updateProfile({ twoFAEnabled: true });
        setToggling(false);
    };

    const handleDisable = async () => {
        setToggling(true);
        await new Promise((r) => setTimeout(r, 400));
        updateProfile({ twoFAEnabled: false });
        setToggling(false);
        setConfirmOff(false);
    };

    return (
        <div className="p-4 bg-black/40 border border-gray-800 rounded-lg">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {enabled ? (
                        <ShieldCheck className="w-4 h-4 text-cyber-neonGreen" />
                    ) : (
                        <ShieldAlert className="w-4 h-4 text-yellow-400" />
                    )}

                    <div>
                        <p className="text-sm font-mono font-bold text-gray-300">
                            Two-Factor Authentication
                        </p>
                        <p className="text-xs font-mono text-gray-600 mt-0.5">
                            {enabled
                                ? 'OTP sent to your email on every login'
                                : 'Add extra security to your account'}
                        </p>
                    </div>
                </div>

                <motion.button
                    onClick={handleToggle}
                    disabled={toggling}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none"
                    style={{
                        background: enabled ? '#39ff14' : '#1e293b',
                        border: `1px solid ${enabled ? '#39ff14' : '#334155'}`,
                        boxShadow: enabled
                            ? '0 0 12px rgba(57,255,20,0.4)'
                            : 'none'
                    }}
                >
                    <motion.div
                        animate={{ x: enabled ? 24 : 2 }}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30
                        }}
                        className="absolute top-0.5 w-5 h-5 rounded-full"
                        style={{
                            background: enabled ? '#03060f' : '#475569'
                        }}
                    />
                </motion.button>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${enabled
                        ? 'text-cyber-neonGreen bg-cyber-neonGreen/10 border border-cyber-neonGreen/30'
                        : 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30'
                        }`}
                >
                    {enabled ? '● ENABLED' : '○ DISABLED'}
                </span>

                {user?.email && (
                    <span className="text-xs font-mono text-gray-600">
                        OTP → {user.email}
                    </span>
                )}
            </div>

            <AnimatePresence>
                {confirmOff && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-cyber-neonRed/10 border border-cyber-neonRed/30 rounded"
                    >
                        <p className="text-xs font-mono text-cyber-neonRed mb-3">
                            ⚠️ Disabling 2FA will make your account less secure.
                            Confirm?
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleDisable}
                                disabled={toggling}
                                className="px-3 py-1.5 text-xs font-mono font-bold text-black bg-cyber-neonRed rounded hover:opacity-90 transition-all"
                            >
                                {toggling
                                    ? 'Disabling...'
                                    : 'Yes, Disable'}
                            </button>

                            <button
                                onClick={() => setConfirmOff(false)}
                                className="px-3 py-1.5 text-xs font-mono text-gray-400 border border-gray-700 rounded hover:text-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ProfilePage = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState('overview');
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || '',
        organization: user?.organization || '',
        role: user?.role || 'Analyst'
    });

    const handleSave = () => {
        updateProfile(form);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const stats = [
        {
            label: 'Scans Run',
            value: user?.scansRun || 0,
            color: 'text-cyber-neonCyan'
        },
        {
            label: 'Threats Blocked',
            value: user?.threatsBlocked || 0,
            color: 'text-cyber-neonRed'
        },
        {
            label: 'Clearance',
            value: user?.clearanceLevel || 'LEVEL-1',
            color: 'text-cyber-neonPurple'
        },
        {
            label: 'Status',
            value: 'ACTIVE',
            color: 'text-cyber-neonGreen'
        }
    ];

    const activity = [
        { action: 'Malware scan completed', time: '2m ago', type: 'INFO' },
        { action: 'CVE-2024-1234 analyzed', time: '18m ago', type: 'WARNING' },
        { action: 'Phishing email detected', time: '1h ago', type: 'CRITICAL' },
        { action: 'Policy document uploaded', time: '3h ago', type: 'INFO' },
        { action: 'Dashboard accessed', time: '3h ago', type: 'INFO' }
    ];

    const typeColor = {
        CRITICAL:
            'text-cyber-neonRed border-cyber-neonRed/40 bg-cyber-neonRed/10',
        WARNING:
            'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
        INFO:
            'text-cyber-neonCyan border-cyber-neonCyan/40 bg-cyber-neonCyan/10'
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto"
        >
            <h2 className="text-3xl font-display mb-6 border-b border-cyber-neonCyan/30 pb-2">
                <span className="text-cyber-neonCyan">{"//"}</span>{' '}
                OPERATOR PROFILE
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#03060f]/80 border border-cyber-neonCyan/20 rounded-xl p-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(0,243,255,0.05)]">
                        {/* decorative background element */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-neonCyan/5 rounded-bl-full pointer-events-none" />

                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-2 border-cyber-neonCyan p-1 relative mb-4 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                                <div className="absolute inset-0 bg-cyber-neonCyan/20 rounded-full animate-pulse blur" />
                                <div className="w-full h-full bg-[#050a14] rounded-full flex items-center justify-center relative z-10 text-3xl font-display text-cyber-neonCyan">
                                    {user?.avatar || 'CS'}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold font-display text-white tracking-wider">
                                {user?.name || 'Unknown Operator'}
                            </h3>
                            <p className="font-mono text-sm text-cyber-neonCyan/80 mb-1">
                                {user?.role || 'Analyst'}
                            </p>
                            <p className="font-mono text-xs text-gray-500 mb-6">
                                {user?.organization || 'CyberShield Division'}
                            </p>
                        </div>

                        <div className="space-y-3 mt-4">
                            <button
                                onClick={() => setTab('settings')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyber-neonCyan/10 hover:bg-cyber-neonCyan/20 border border-cyber-neonCyan/30 rounded text-sm font-mono text-cyber-neonCyan transition-all"
                            >
                                <Settings className="w-4 h-4" />
                                CONFIGURE PROFILE
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyber-neonRed/10 hover:bg-cyber-neonRed/20 border border-cyber-neonRed/30 rounded text-sm font-mono text-cyber-neonRed transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                TERMINATE SESSION
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setTab('overview')}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm transition-all ${tab === 'overview'
                                    ? 'text-cyber-neonCyan border-b-2 border-cyber-neonCyan bg-cyber-neonCyan/5'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Activity className="w-4 h-4" /> OVERVIEW
                        </button>
                        <button
                            onClick={() => setTab('settings')}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm transition-all ${tab === 'settings'
                                    ? 'text-cyber-neonCyan border-b-2 border-cyber-neonCyan bg-cyber-neonCyan/5'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Settings className="w-4 h-4" /> SETTINGS
                        </button>
                    </div>

                    {/* Tab Content: Overview */}
                    {tab === 'overview' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {stats.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-[#03060f]/60 border border-gray-800 p-4 rounded-lg flex flex-col items-center justify-center text-center"
                                    >
                                        <div className={`text-2xl font-bold font-mono mb-1 ${s.color}`}>
                                            {s.value}
                                        </div>
                                        <div className="text-xs font-mono text-gray-500 uppercase">
                                            {s.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-[#03060f]/80 border border-gray-800 rounded-xl p-6">
                                <h3 className="font-mono flex items-center gap-2 text-white mb-6">
                                    <Activity className="w-4 h-4 text-cyber-neonCyan" />
                                    RECENT ACTIVITY LOG
                                </h3>
                                <div className="space-y-3">
                                    {activity.map((item, idx) => (
                                        <div key={idx} className={`flex items-start justify-between p-3 rounded bg-black/40 border border-gray-900 border-l-2 ${typeColor[item.type]?.split(' ')[1]}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${typeColor[item.type]}`}>
                                                        {item.type}
                                                    </span>
                                                    <p className="text-sm font-mono text-gray-300">
                                                        {item.action}
                                                    </p>
                                                </div>
                                                <p className="text-xs font-mono text-gray-600">
                                                    {item.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Tab Content: Settings */}
                    {tab === 'settings' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-[#03060f]/80 border border-gray-800 rounded-xl p-6 relative">
                                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                                    <h3 className="font-mono flex items-center gap-2 text-white">
                                        <User className="w-4 h-4 text-cyber-neonCyan" />
                                        PERSONAL INFORMATION
                                    </h3>
                                    {!editing ? (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            EDIT
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditing(false)}
                                                className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                CANCEL
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="flex items-center gap-1.5 text-xs font-mono font-bold text-black bg-cyber-neonCyan hover:bg-cyber-neonCyan/90 transition-colors px-3 py-1 rounded"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                SAVE
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-gray-500 block">OPERATOR NAME</label>
                                        <input
                                            type="text"
                                            disabled={!editing}
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-neonCyan/50 disabled:opacity-70 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-gray-500 block">EMAIL ADDRESS</label>
                                        <input
                                            type="text"
                                            disabled={true}
                                            value={user?.email || ''}
                                            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm font-mono text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-gray-500 block">COMPANY / ORGANIZATION</label>
                                        <input
                                            type="text"
                                            disabled={!editing}
                                            value={form.organization}
                                            onChange={(e) => setForm({ ...form, organization: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-neonCyan/50 disabled:opacity-70 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-gray-500 block">DESIGNATED ROLE</label>
                                        <select
                                            disabled={!editing}
                                            value={form.role}
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyber-neonCyan/50 disabled:opacity-70 transition-colors"
                                        >
                                            <option value="Analyst">Analyst</option>
                                            <option value="Administrator">Administrator</option>
                                            <option value="Threat Hunter">Threat Hunter</option>
                                            <option value="CISO">CISO</option>
                                        </select>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {saved && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute top-4 right-1/2 translate-x-1/2 bg-cyber-neonGreen/10 border border-cyber-neonGreen/30 text-cyber-neonGreen font-mono text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            PROFILE UPDATED
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="bg-[#03060f]/80 border border-gray-800 rounded-xl p-6">
                                <h3 className="font-mono flex items-center gap-2 text-white mb-6 border-b border-gray-800 pb-4">
                                    <Shield className="w-4 h-4 text-cyber-neonCyan" />
                                    SECURITY PREFERENCES
                                </h3>

                                <TwoFAToggle user={user} updateProfile={updateProfile} />

                                <div className="mt-4 p-4 bg-black/40 border border-gray-800 rounded-lg flex items-start gap-3">
                                    <Lock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-mono text-gray-300">Password</p>
                                        <p className="text-xs font-mono text-gray-600 mt-1">
                                            Last changed 14 days ago. Password policy enforces updates every 90 days.
                                        </p>
                                        <button className="mt-3 px-3 py-1.5 border border-gray-700 rounded text-xs font-mono text-gray-400 hover:text-white transition-colors">
                                            CHANGE PASSWORD
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ProfilePage;