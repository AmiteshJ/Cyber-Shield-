import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Mail, User, Building, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupPage = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', organization: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const checks = [
        { label: 'Min 8 characters', ok: form.password.length >= 8 },
        { label: 'Uppercase letter', ok: /[A-Z]/.test(form.password) },
        { label: 'Number included', ok: /\d/.test(form.password) },
        { label: 'Passwords match', ok: form.password && form.password === form.confirm },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!checks.every(c => c.ok)) { setError('Password requirements not met.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        try {
            signup({ name: form.name, email: form.email, password: form.password, organization: form.organization || 'Independent', avatar: form.name.slice(0, 2).toUpperCase() });
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4 relative overflow-hidden">
            <style>{`
        @keyframes scanline { 0% { transform: translateY(-100vh); } 100% { transform: translateY(200vh); } }
        .scan { animation: scanline 10s linear infinite; }
      `}</style>
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-neonCyan/50 to-transparent scan pointer-events-none z-50" />
            <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(0,243,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                className="relative z-10 w-full max-w-md">

                <div className="text-center mb-8">
                    <Shield className="w-12 h-12 text-cyber-neonCyan mx-auto mb-3" />
                    <h1 className="text-3xl font-display font-black text-white tracking-widest">
                        CYBER<span className="text-cyber-neonCyan">SHIELD</span>
                    </h1>
                    <p className="text-xs font-mono text-gray-500 tracking-widest mt-1">OPERATOR ENROLLMENT</p>
                </div>

                <div className="glass-panel p-8 relative border border-cyber-neonCyan/20">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-neonCyan/60" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-neonCyan/60" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-neonCyan/60" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-neonCyan/60" />

                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-800">
                        <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-pulse" />
                        <span className="font-mono text-xs text-cyber-neonPurple tracking-widest">NEW OPERATOR REGISTRATION</span>
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 mb-4 p-3 bg-cyber-neonRed/10 border border-cyber-neonRed/40 rounded font-mono text-xs text-cyber-neonRed">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { label: 'FULL NAME', name: 'name', type: 'text', icon: User, placeholder: 'John Doe' },
                            { label: 'EMAIL ADDRESS', name: 'email', type: 'email', icon: Mail, placeholder: 'operator@domain.com' },
                            { label: 'ORGANIZATION (OPTIONAL)', name: 'organization', type: 'text', icon: Building, placeholder: 'Corp / Agency' },
                        ].map(({ label, name, type, icon: Icon, placeholder }) => (
                            <div key={name}>
                                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-2">{label}</label>
                                <div className="relative">
                                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type={type} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder}
                                        required={name !== 'organization'}
                                        className="w-full bg-black/60 border border-gray-700 rounded pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyber-neonCyan transition-colors"
                                    />
                                </div>
                            </div>
                        ))}

                        <div>
                            <label className="block text-xs font-mono text-gray-400 tracking-widest mb-2">PASSCODE</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required
                                    className="w-full bg-black/60 border border-gray-700 rounded pl-10 pr-12 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyber-neonCyan transition-colors"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyber-neonCyan transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {form.password && (
                                <div className="mt-2 grid grid-cols-2 gap-1">
                                    {checks.slice(0, 3).map((c, i) => (
                                        <div key={i} className={`flex items-center gap-1 text-[10px] font-mono ${c.ok ? 'text-cyber-neonGreen' : 'text-gray-600'}`}>
                                            <CheckCircle className="w-3 h-3" /> {c.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-gray-400 tracking-widest mb-2">CONFIRM PASSCODE</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="••••••••" required
                                    className={`w-full bg-black/60 border rounded pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors ${form.confirm && (checks[3].ok ? 'border-cyber-neonGreen' : 'border-cyber-neonRed/50')} ${!form.confirm ? 'border-gray-700 focus:border-cyber-neonCyan' : ''}`}
                                />
                            </div>
                        </div>

                        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="w-full py-3 bg-cyber-neonCyan text-black font-display font-black tracking-widest text-sm rounded flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all mt-2">
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> REGISTERING...</>
                            ) : (
                                <><ChevronRight className="w-4 h-4" /> ENROLL OPERATOR</>
                            )}
                        </motion.button>
                    </form>

                    <p className="text-center mt-5 text-xs font-mono text-gray-600">
                        ALREADY ENROLLED?{' '}
                        <Link to="/login" className="text-cyber-neonCyan hover:text-white transition-colors tracking-widest">AUTHENTICATE</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default SignupPage;