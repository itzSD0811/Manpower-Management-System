import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Layers, Briefcase, LayoutDashboard, Settings, Moon, Sun, FileText, CalendarDays, Github, DollarSign, UserCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { canUserViewPage, hasMasterPermissions } from '../services/permissionService';
import { PageId } from '../services/permissionService';

const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<Record<PageId, boolean>>({
    dashboard: true,
    profile: true,
    employees: false,
    attendance: false,
    prepayments: false,
    sections: false,
    groups: false,
    files: false,
    settings: false,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      if (!currentUser?.uid) {
        // Default: no access
        setPermissions({
          dashboard: false,
          profile: false,
          employees: false,
          attendance: false,
          prepayments: false,
          sections: false,
          groups: false,
          files: false,
          settings: false,
        });
        return;
      }

      try {
        // Check master permissions for settings access
        const hasMaster = await hasMasterPermissions(currentUser.uid);
        
        const perms: Record<PageId, boolean> = {
          dashboard: await canUserViewPage(currentUser.uid, 'dashboard'),
          profile: await canUserViewPage(currentUser.uid, 'profile'), // Check permission for profile
          employees: await canUserViewPage(currentUser.uid, 'employees'),
          attendance: await canUserViewPage(currentUser.uid, 'attendance'),
          prepayments: await canUserViewPage(currentUser.uid, 'prepayments'),
          sections: await canUserViewPage(currentUser.uid, 'sections'),
          groups: await canUserViewPage(currentUser.uid, 'groups'),
          files: await canUserViewPage(currentUser.uid, 'files'),
          settings: hasMaster, // Only master permissions or administrator can access settings
        };
        setPermissions(perms);
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };

    loadPermissions();
  }, [currentUser]);
  
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
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {permissions.profile && (
          <NavLink to="/profile" className={linkClass}>
            <UserCircle size={20} />
            <span className="font-medium">Profile</span>
          </NavLink>
        )}
        
        {permissions.dashboard && (
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard size={20} />
          <span className="font-medium">Dashboard</span>
        </NavLink>
        )}
        
        {(permissions.employees || permissions.attendance || permissions.prepayments) && (
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Manpower
        </div>
        )}
        
        {permissions.employees && (
        <NavLink to="/employees" className={linkClass}>
          <Users size={20} />
          <span className="font-medium">Employees</span>
        </NavLink>
        )}
        
        {permissions.attendance && (
        <NavLink to="/attendance" className={linkClass}>
          <CalendarDays size={20} />
          <span className="font-medium">Attendance</span>
        </NavLink>
        )}
        
        {permissions.prepayments && (
          <NavLink to="/prepayments" className={linkClass}>
            <DollarSign size={20} />
            <span className="font-medium">Prepayments</span>
          </NavLink>
        )}

        {(permissions.sections || permissions.groups) && (
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Configuration
        </div>
        )}
        
        {permissions.sections && (
        <NavLink to="/sections" className={linkClass}>
          <Layers size={20} />
          <span className="font-medium">Sections</span>
        </NavLink>
        )}
        
        {permissions.groups && (
        <NavLink to="/groups" className={linkClass}>
          <Briefcase size={20} />
          <span className="font-medium">Groups</span>
        </NavLink>
        )}

        {permissions.files && (
          <>
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Reports
        </div>
        <NavLink to="/files" className={linkClass}>
          <FileText size={20} />
          <span className="font-medium">Generate Files</span>
        </NavLink>
          </>
        )}

      </nav>

      {/* System Settings at Bottom */}
      <div className="px-4 pb-2 space-y-2">
         {permissions.settings && (
         <NavLink to="/settings" className={linkClass}>
          <Settings size={20} />
          <span className="font-medium">System Config</span>
        </NavLink>
         )}
        
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
