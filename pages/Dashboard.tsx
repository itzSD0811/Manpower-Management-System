
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../services/db';
import { 
  Users, Layers, Briefcase, AlertTriangle, CalendarDays, 
  TrendingUp, Clock, FileText, Plus, ArrowRight, Activity,
  UserPlus, Building2, DollarSign, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmployeeEntity, SectionEntity, GroupEntity, AttendanceRecordEntity } from '../types';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    employees: 0, 
    sections: 0, 
    groups: 0,
    attendanceRecords: 0,
    recentEmployees: 0
  });
  const [sectionDistribution, setSectionDistribution] = useState<{name: string, count: number}[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecordEntity[]>([]);
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFirebaseConfigured, dbType } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (dbType === 'firebase' && !isFirebaseConfigured) {
        setLoading(false);
        return;
      }
      try {
        const [empData, secData, grpData, attendanceData] = await Promise.all([
          db.getEmployees(),
          db.getSections(),
          db.getGroups(),
          db.getAttendanceRecords()
        ]);
        
        // Calculate section distribution
        const sectionMap = new Map<string, number>();
        empData.forEach(emp => {
          const count = sectionMap.get(emp.sectionId) || 0;
          sectionMap.set(emp.sectionId, count + 1);
        });
        
        const distribution = secData.map(sec => ({
          name: sec.name,
          count: sectionMap.get(sec.id) || 0
        })).sort((a, b) => b.count - a.count);

        // Get recent attendance records (last 5)
        const sortedAttendance = attendanceData
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          })
          .slice(0, 5);

        // Calculate recent employees (joined in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEmployees = empData.filter(emp => {
          if (!emp.joinedDate) return false;
          const joined = new Date(emp.joinedDate);
          return joined >= thirtyDaysAgo;
        }).length;

        setStats({
          employees: empData.length,
          sections: secData.length,
          groups: grpData.length,
          attendanceRecords: attendanceData.length,
          recentEmployees
        });
        setSectionDistribution(distribution);
        setRecentAttendance(sortedAttendance);
        setSections(secData);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dbType, isFirebaseConfigured]);

  const StatCard = ({ title, count, icon: Icon, color, subtitle, trend }: { 
    title: string, 
    count: number, 
    icon: any, 
    color: string,
    subtitle?: string,
    trend?: string
  }) => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-all duration-200 hover:shadow-lg">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className={`flex-shrink-0 rounded-lg p-3 ${color}`}>
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : count.toLocaleString()}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
              {trend && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> {trend}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getSectionName = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : sectionId.slice(0, 8) + '...';
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening with your workforce.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/employees')} variant="secondary" icon={<UserPlus size={16} />}>
            Add Employee
          </Button>
          <Button onClick={() => navigate('/attendance')} icon={<CalendarDays size={16} />}>
            Mark Attendance
          </Button>
        </div>
      </div>
      
      {dbType === 'firebase' && !isFirebaseConfigured && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-lg flex items-center gap-3">
            <AlertTriangle size={20} />
            <div>
                <p className="font-medium">Firebase Not Configured</p>
                <p className="text-sm">Please go to <a href="#/settings" className="underline hover:text-yellow-600 dark:hover:text-yellow-200">Settings</a> to configure your Firebase connection.</p>
            </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Employees" 
          count={stats.employees} 
          icon={Users} 
          color="bg-blue-500"
          subtitle="Active workforce"
        />
        <StatCard 
          title="Active Sections" 
          count={stats.sections} 
          icon={Layers} 
          color="bg-purple-500"
          subtitle="Organizational units"
        />
        <StatCard 
          title="Defined Groups" 
          count={stats.groups} 
          icon={Briefcase} 
          color="bg-orange-500"
          subtitle="Team groups"
        />
        <StatCard 
          title="Attendance Records" 
          count={stats.attendanceRecords} 
          icon={FileText} 
          color="bg-green-500"
          subtitle="Monthly records"
          trend={stats.recentEmployees > 0 ? `${stats.recentEmployees} new this month` : undefined}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">New Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : stats.recentEmployees}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
              <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? '...' : recentAttendance.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest records</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quick Actions</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">Get Started</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage your workforce</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={20} /> Employee Distribution by Section
              </h2>
              <button 
                onClick={() => navigate('/sections')}
                className="text-sm text-dns-red hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : sectionDistribution.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Layers size={48} className="mx-auto mb-3 opacity-50" />
                <p>No sections found. Create your first section to get started.</p>
                <Button 
                  onClick={() => navigate('/sections')} 
                  className="mt-4" 
                  size="sm"
                  icon={<Plus size={14} />}
                >
                  Create Section
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sectionDistribution.map((section, index) => {
                  const maxCount = Math.max(...sectionDistribution.map(s => s.count), 1);
                  const percentage = (section.count / maxCount) * 100;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{section.name}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{section.count} employees</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays size={20} /> Recent Attendance
              </h2>
              <button 
                onClick={() => navigate('/attendance')}
                className="text-sm text-dns-red hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : recentAttendance.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CalendarDays size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-4">No attendance records yet.</p>
                <Button 
                  onClick={() => navigate('/attendance')} 
                  size="sm"
                  icon={<Plus size={14} />}
                >
                  Mark Attendance
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAttendance.map((record) => (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate('/attendance')}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getMonthName(record.month)} {record.year}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Section: {getSectionName(record.sectionId)}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity size={20} /> Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/employees')}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left group"
            >
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Manage Employees</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View and edit employee records</p>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left group"
            >
              <CalendarDays className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">Mark Attendance</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Record daily attendance</p>
            </button>

            <button
              onClick={() => navigate('/files')}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left group"
            >
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">Generate Reports</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Export Excel files</p>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left group"
            >
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">System Settings</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure database</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
