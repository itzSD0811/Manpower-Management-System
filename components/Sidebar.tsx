import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Layers, Briefcase, LayoutDashboard, Settings, Moon, Sun, FileText, CalendarDays, Github, DollarSign } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../context/ThemeContext';

const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-dns-red text-white shadow-md'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen fixed left-0 top-0 flex flex-col z-10 hidden md:flex transition-colors duration-200">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-center">
        <Logo className="h-16 text-gray-800 dark:text-gray-100" />
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
        <NavLink to="/" className={linkClass}>
          <LayoutDashboard size={20} />
          <span className="font-medium">Dashboard</span>
        </NavLink>
        
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Manpower
        </div>
        
        <NavLink to="/employees" className={linkClass}>
          <Users size={20} />
          <span className="font-medium">Employees</span>
        </NavLink>
        
        <NavLink to="/attendance" className={linkClass}>
          <CalendarDays size={20} />
          <span className="font-medium">Attendance</span>
        </NavLink>
        
        <NavLink to="/prepayments" className={linkClass}>
          <DollarSign size={20} />
          <span className="font-medium">Prepayments</span>
        </NavLink>

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Configuration
        </div>
        
        <NavLink to="/sections" className={linkClass}>
          <Layers size={20} />
          <span className="font-medium">Sections</span>
        </NavLink>
        
        <NavLink to="/groups" className={linkClass}>
          <Briefcase size={20} />
          <span className="font-medium">Groups</span>
        </NavLink>

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Reports
        </div>

        <NavLink to="/files" className={linkClass}>
          <FileText size={20} />
          <span className="font-medium">Generate Files</span>
        </NavLink>

      </nav>

      {/* System Settings at Bottom */}
      <div className="px-4 pb-2 space-y-2">
         <NavLink to="/settings" className={linkClass}>
          <Settings size={20} />
          <span className="font-medium">System Config</span>
        </NavLink>
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
          <p>Version 1.0.0-beta</p>
          <p className="flex items-center gap-1 mt-2">
            <a href="http://github.com/itzSD0811" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-700 dark:text-gray-300 hover:text-dns-red dark:hover:text-dns-red flex items-center gap-1">
              Developed By ItzSD <Github size={16} />
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
