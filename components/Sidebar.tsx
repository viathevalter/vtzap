import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, LayoutTemplate, Crosshair, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Enviar WhatsApp', path: '/', icon: <MessageSquare size={20} /> },
    { name: 'Templates', path: '/templates', icon: <LayoutTemplate size={20} /> },
    { name: 'Calibração', path: '/calibration', icon: <Crosshair size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="font-bold text-lg">P</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight">Painel Interno</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
            ADM
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Administrador</p>
            <p className="text-xs text-slate-400">Local User</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;