import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-cyber-black overflow-hidden relative">
      {/* Background Animated Grid Elements */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-cyber-neonCyan to-transparent"></div>
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-neonCyan to-transparent"></div>
      </div>

      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto z-10 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
