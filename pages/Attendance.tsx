import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Plus, Sun, Sunrise, Moon, MoonStar, Trash2 } from 'lucide-react'; 
import db from '../services/db'; 
import { SectionEntity, GroupEntity, EmployeeEntity, AttendanceRecordEntity, AttendanceData } from '../types';
import Select from '../components/ui/Select';
import AttendanceCell, { AttendanceStatus } from '../components/ui/AttendanceCell';
import { useAuth } from '../context/AuthContext';
import { canUserEditPage } from '../services/permissionService';

const Attendance: React.FC = () => {
  const { currentUser } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'view' | 'delete' | null>(null);

  // Data State
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [groups, setGroups] = useState<GroupEntity[]>([]);
  const [employees, setEmployees] = useState<EmployeeEntity[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecordEntity[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeEntity[]>([]);

  // Form/Selection State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  
  // View/Delete Target State (selectedRecord is still needed for view/edit)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordEntity | null>(null);

  // Filter State
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [filterGroupInModal, setFilterGroupInModal] = useState<string>('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  console.log('Component Render. Active Modal:', activeModal, 'Selected Record:', selectedRecord);

  useEffect(() => {
    loadInitialData();
    checkPermissions();
  }, [currentUser]);

  const checkPermissions = async () => {
    if (currentUser?.uid) {
      const hasEdit = await canUserEditPage(currentUser.uid, 'attendance');
      setCanEdit(hasEdit);
    }
  };
  
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAttendanceRecords(),
        loadSectionsAndGroups(),
        loadAllEmployees(),
      ]);
    } catch (e) {
      console.error("Failed to load initial data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSectionsAndGroups = async () => {
    const [secData, grpData] = await Promise.all([db.getSections(), db.getGroups()]);
    setSections(secData);
    setGroups(grpData);
  };
  
  const loadAllEmployees = async () => {
    const empData = await db.getEmployees();
    setAllEmployees(empData);
  };
  
  const loadAttendanceRecords = async () => {
    const records = await db.getAttendanceRecords();
    setAllAttendanceRecords(records);
  };
  
  useEffect(() => {
    if ((activeModal === 'create' || activeModal === 'edit') && selectedSection) {
      loadEmployees();
    } else {
      setEmployees([]);
    }
  }, [activeModal, selectedSection]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const empData = await db.getEmployeesBySection(selectedSection);
      setEmployees(empData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAttendanceChange = (employeeId: string, day: number, status: AttendanceStatus) => {
    setAttendanceData(prev => {
      const newEmployeeData = { ...prev[employeeId] };
      if (!newEmployeeData.daily) {
        newEmployeeData.daily = {};
      }
      newEmployeeData.daily[day] = status;
      
      return {
        ...prev,
        [employeeId]: newEmployeeData,
      };
    });
  };

  const handleAdditionalShiftsChange = (employeeId: string, value: string) => {
    const count = parseFloat(value);
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        daily: prev[employeeId]?.daily || {},
        additionalShifts: isNaN(count) ? 0 : count,
      },
    }));
  };

  const [modalError, setModalError] = useState('');

  // ...

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedRecord(null);
    setFilterGroupInModal('');
    setModalError(''); // Clear error on close
  };

  const handleOpenCreate = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedSection('');
    setAttendanceData({});
    setModalError(''); // Clear error on open
    setActiveModal('create');
  };

  const handleOpenEdit = (record: AttendanceRecordEntity) => {
    setSelectedRecord(record);
    setSelectedYear(record.year);
    setSelectedMonth(record.month - 1);
    setSelectedSection(record.sectionId);
    setAttendanceData(record.attendanceData);
    setModalError(''); // Clear error on open
    setActiveModal('edit');
  };

  // ...

  const handleOpenView = (record: AttendanceRecordEntity) => {
    console.log("handleOpenView called with:", record);
    setSelectedRecord(record);
    setActiveModal('view');
  };
  
  const handleOpenDelete = (record: AttendanceRecordEntity) => {
    setSelectedRecord(record);
    setActiveModal('delete');
  };

  const handleConfirmDelete = async () => {
    if (selectedRecord) {
      setIsSaving(true);
      setModalError('');
      try {
        await db.deleteAttendanceRecord(selectedRecord.id);
        handleCloseModal();
        await loadAttendanceRecords();
      } catch (e: any) {
        console.error("Failed to delete record:", e);
        setModalError(e.message || "Failed to delete attendance record. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleChangeFromView = () => {
    if (selectedRecord) {
      handleOpenEdit(selectedRecord);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSection) {
      setModalError("Please select a section.");
      return;
    }
    
    setIsSaving(true);
    setModalError(''); // Clear previous error

    const recordId = (activeModal === 'edit' && selectedRecord)
      ? selectedRecord.id
      : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedSection}`;

    const record: AttendanceRecordEntity = {
      id: recordId,
      year: selectedYear,
      month: selectedMonth + 1,
      sectionId: selectedSection,
      attendanceData: attendanceData,
    };
    
    try {
      await db.saveAttendanceRecord(record);
      handleCloseModal();
      await loadAttendanceRecords();
    } catch (e: any) {
      console.error(e);
      setModalError(e.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || id;
  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || '-';

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, label: 'January' }, { value: 1, label: 'February' },
    { value: 2, label: 'March' }, { value: 3, label: 'April' },
    { value: 4, label: 'May' }, { value: 5, label: 'June' },
    { value: 6, label: 'July' }, { value: 7, label: 'August' },
    { value: 8, label: 'September' }, { value: 9, label: 'October' },
    { value: 10, label: 'November' }, { value: 11, label: 'December' }
  ];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const defaultStatus: AttendanceStatus = { day: false, night: false, dayHalf: false, nightHalf: false };

  const filteredRecords = allAttendanceRecords.filter(rec => {
    const matchYear = filterYear ? rec.year === filterYear : true;
    const matchMonth = filterMonth !== '' ? rec.month === (filterMonth + 1) : true;
    const matchSection = filterSection ? rec.sectionId === filterSection : true;
    return matchYear && matchMonth && matchSection;
  });

  const modalTitle = (
    <div className="flex items-center gap-4">
      <span>{activeModal === 'create' || activeModal === 'edit' ? 'Mark Attendance' : ''}</span> {/* Adjusted title */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-4">
        <div className="flex items-center gap-1"><Sun size={14} /> Day</div>
        <div className="flex items-center gap-1"><Sunrise size={14} /> Day Half</div>
        <div className="flex items-center gap-1"><Moon size={14} /> Night</div>
        <div className="flex items-center gap-1"><MoonStar size={14} /> Night Half</div>
      </div>
    </div>
  );

  const startScrolling = (direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft += direction === 'right' ? 10 : -10;
      }
    }, 20);
  };

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollZone = 50;

    if (x > rect.width - scrollZone) {
      startScrolling('right');
    } else if (x < scrollZone) {
      startScrolling('left');
    } else {
      stopScrolling();
    }
  };

  const handleMouseLeave = () => {
    stopScrolling();
  };
 
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track employee attendance and generate reports.</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>Mark Attendance</Button>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Filter by Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Year</label>
            <select 
              value={filterYear?.toString() || ''} 
              onChange={e => setFilterYear(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y.toString()}>{y.toString()}</option>)}
            </select>
          </div>

          {/* Filter by Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Month</label>
            <select 
              value={filterMonth?.toString() || ''} 
              onChange={e => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">All Months</option>
              {months.map(m => <option key={m.value} value={m.value.toString()}>{m.label}</option>)}
            </select>
          </div>

          {/* Filter by Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Section</label>
            <select 
              value={filterSection} 
              onChange={e => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Clear Button */}
          <Button variant="secondary" onClick={() => {setFilterYear(''); setFilterMonth(''); setFilterSection('')}}>Clear Filters</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Year/Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Night</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Halfs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Additional</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-200">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center p-8">Loading records...</td></tr>
            ) : filteredRecords.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-gray-500">No attendance records found.</td></tr>
            ) : (
              filteredRecords.map(rec => {
                let totalDay = 0, totalNight = 0, totalHalf = 0, totalAdditional = 0;
                Object.values(rec.attendanceData).forEach(empData => {
                  if (empData.daily) {
                    Object.values(empData.daily).forEach(status => {
                      if (status.day) totalDay++;
                      if (status.night) totalNight++;
                      if (status.dayHalf) totalHalf++;
                      if (status.nightHalf) totalHalf++;
                    });
                  }
                  if (empData.additionalShifts) {
                    totalAdditional += empData.additionalShifts;
                  }
                });

                return (
                  <tr key={rec.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{rec.year} / {months.find(m => m.value === rec.month - 1)?.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getSectionName(rec.sectionId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{totalDay}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{totalNight}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{totalHalf}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{totalAdditional}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenView(rec)}
                        >
                          View
                        </Button>
                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDelete(rec)}
                            className="bg-red-500 bg-opacity-20 text-red-700 hover:bg-red-600 hover:bg-opacity-30 dark:bg-red-400 dark:bg-opacity-20 dark:text-red-300 dark:hover:bg-red-500 dark:hover:bg-opacity-30"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <Modal isOpen={activeModal === 'create' || activeModal === 'edit'} onClose={handleCloseModal} title={modalTitle} size="full">
        <div className="space-y-4">
          {modalError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{modalError}</span>
              </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Year" value={selectedYear.toString()} onChange={(e) => setSelectedYear(parseInt(e.target.value))} options={years.map(y => ({ value: y.toString(), label: y.toString() }))} disabled={activeModal === 'edit'} />
            <Select label="Month" value={selectedMonth.toString()} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} options={months.map(m => ({ value: m.value.toString(), label: m.label }))} disabled={activeModal === 'edit'} />
            <Select label="Section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} options={sections.map(s => ({ value: s.id, label: s.name }))} placeholder="Select Section" disabled={isLoading || isSaving || activeModal === 'edit'} />
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 z-10 bg-white dark:bg-gray-800">
              <table className="table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Emp #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-64">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48 pr-4">Group</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap text-sm w-24 text-gray-900 dark:text-gray-200">{emp.employeeNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm w-64 text-gray-900 dark:text-gray-200">{emp.fullName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm w-48 pr-4 text-gray-900 dark:text-gray-200">{getGroupName(emp.groupId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div ref={scrollContainerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="flex-grow overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {daysArray.map(day => (
                      <th key={day} className="w-28 px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{day}</th>
                    ))}
                    <th className="w-32 px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 normal-case bg-green-50 dark:bg-green-800">Additional</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-200 dark:border-gray-700">
                      {daysArray.map(day => (
                        <td key={day} className="w-28 px-1 py-1 whitespace-nowrap text-sm text-center">
                          <AttendanceCell 
                            status={attendanceData[emp.id]?.daily?.[day] || defaultStatus}
                            onChange={(status) => handleAttendanceChange(emp.id, day, status)}
                          />
                        </td>
                      ))}
                      <td className="w-32 px-1 py-1 whitespace-nowrap text-sm text-center">
                        <input
                          type="number"
                          step="0.5"
                          className="w-full text-center bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600"
                          value={attendanceData[emp.id]?.additionalShifts || ''}
                          onChange={(e) => handleAdditionalShiftsChange(emp.id, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} isLoading={isSaving}>Submit Attendance</Button>
        </div>
      </Modal>

      {/* View Modal */}
      {selectedRecord && (
        <Modal isOpen={activeModal === 'view'} onClose={handleCloseModal} title={`Viewing Attendance: ${selectedRecord.year}/${months.find(m => m.value === selectedRecord.month - 1)?.label}`} size="full">
          <div className="space-y-4">
            <div className="mb-4">
              <Select 
                label="Filter by Group" 
                value={filterGroupInModal} 
                onChange={e => setFilterGroupInModal(e.target.value)}
                options={[{value: '', label: 'All Groups'}, ...groups.map(g => ({value: g.id, label: g.name}))]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">Emp #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">Group</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">Employee</th>
                    {Array.from({ length: new Date(selectedRecord.year, selectedRecord.month, 0).getDate() }, (_, i) => i + 1).map(day => (
                      <th key={day} className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">{day}</th>
                    ))}
                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-800">+</th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(!selectedRecord.attendanceData || Object.keys(selectedRecord.attendanceData).length === 0) ? (
                    <tr>
                      <td colSpan={new Date(selectedRecord.year, selectedRecord.month, 0).getDate() + 5} className="px-6 py-4 text-center text-gray-500">
                        No attendance details available for this record.
                      </td>
                    </tr>
                  ) : (
                    Object.keys(selectedRecord.attendanceData)
                      .filter(empId => {
                        if (!filterGroupInModal) return true;
                        const emp = allEmployees.find(e => e.id === empId);
                        return emp && emp.groupId === filterGroupInModal;
                      })
                      .map(empId => {
                        const emp = allEmployees.find(e => e.id === empId);
                        const empAttendance = selectedRecord.attendanceData[empId];
                        
                        let shiftCount = 0;
                        if (empAttendance?.daily) {
                            Object.values(empAttendance.daily).forEach(status => {
                                if (status.day || status.night) shiftCount += 1;
                                if (status.dayHalf || status.nightHalf) shiftCount += 0.5;
                            });
                        }
                        const totalShifts = shiftCount + (empAttendance?.additionalShifts || 0);

                        return (
                          <tr key={empId}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{emp?.employeeNumber || 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{getGroupName(emp?.groupId || '')}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{emp?.fullName || 'Unknown'}</td>
                            {Array.from({ length: new Date(selectedRecord.year, selectedRecord.month, 0).getDate() }, (_, i) => i + 1).map(day => {
                              const status = empAttendance?.daily?.[day];
                              return (
                                <td key={day} className="w-20 px-1 py-1 whitespace-nowrap text-xs text-center border border-gray-200 dark:border-gray-600">
                                  <div className="flex justify-center items-center gap-1">
                                    {status?.day && <span className="text-orange-600 dark:text-orange-400 font-semibold">Day</span>}
                                    {status?.dayHalf && <span className="text-yellow-600 dark:text-yellow-400 font-semibold">Day H</span>}
                                    {status?.night && <span className="text-green-600 dark:text-green-400 font-semibold">Night</span>}
                                    {status?.nightHalf && <span className="text-blue-600 dark:text-blue-400 font-semibold">Night H</span>}
                                    {!status?.day && !status?.dayHalf && !status?.night && !status?.nightHalf && <span className="text-gray-500 dark:text-gray-400">-</span>}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-1 py-2 whitespace-nowrap text-sm text-center font-bold border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-800 text-green-800 dark:text-green-200">
                                {empAttendance?.additionalShifts || 0}
                            </td>
                            <td className="px-1 py-2 whitespace-nowrap text-sm text-center font-bold border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">
                                {totalShifts}
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Close</Button>
            {canEdit && (
              <Button type="button" onClick={handleChangeFromView}>Change</Button>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedRecord && (
        <Modal isOpen={activeModal === 'delete'} onClose={handleCloseModal} title="Confirm Deletion" size="md">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the attendance record for <strong>{months.find(m => m.value === selectedRecord.month)?.label} {selectedRecord.year}</strong> for section <strong>{getSectionName(selectedRecord.sectionId)}</strong>? 
            <br />
            This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Cancel</Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete} isLoading={isSaving}>Delete</Button>
          </div>
        </Modal>
      )}

      {/* Removed Delete Confirmation Modal */}
    </div>
  );
};

export default Attendance;
