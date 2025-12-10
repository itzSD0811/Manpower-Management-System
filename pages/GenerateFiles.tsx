import React, { useState, useEffect } from 'react';
import { Filter, Search, X, FileSpreadsheet, Download, CheckCircle, XCircle } from 'lucide-react';
import { EmployeeEntity, SectionEntity, GroupEntity } from '../types';
import db from '../services/db';
import Button from '../components/ui/Button';
import { generateEmployeeListExcel, generatePaymentDetailsExcel } from '../utils/excelExport';
import Modal from '../components/ui/Modal';

const GenerateFiles: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeEntity[]>([]);
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [groups, setGroups] = useState<GroupEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');

  // Payment Details State
  const [paymentSectionId, setPaymentSectionId] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  // Notifications
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empData, secData, grpData] = await Promise.all([db.getEmployees(), db.getSections(), db.getGroups()]);
      setEmployees(empData);
      setSections(secData);
      setGroups(grpData);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSectionId('');
    setFilterGroupId('');
  };

  // Filter Logic
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = 
        e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = filterSectionId ? e.sectionId === filterSectionId : true;
    const matchesGroup = filterGroupId ? e.groupId === filterGroupId : true;
    return matchesSearch && matchesSection && matchesGroup;
  });

  const filterAvailableGroups = filterSectionId ? groups.filter(g => g.sectionId === filterSectionId) : groups;

  const handleExport = async () => {
    if (filteredEmployees.length === 0) {
        setErrorMessage("No employees selected to export.");
        setTimeout(() => setErrorMessage(''), 3000);
        return;
    }

    setIsProcessing(true);
    try {
        await generateEmployeeListExcel(filteredEmployees, sections, groups);
        setSuccessMessage("Employee list exported successfully!");
        setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
        console.error(error);
        setErrorMessage("Failed to generate Excel file.");
        setTimeout(() => setErrorMessage(''), 3000);
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePaymentDownload = async () => {
    setModalErrorMessage('');
    if (!paymentSectionId) {
        setModalErrorMessage("Please select a section.");
        return;
    }

    const [yearStr, monthStr] = paymentPeriod.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    try {
        setIsProcessing(true);
        // New Strategy: Fetch all records and find the one we need.
        // This is less efficient but more robust against ID format mismatches.
        const allAttendanceRecords = await db.getAttendanceRecords();
        const attendanceRecord = allAttendanceRecords.find(r => 
            r.year === year && 
            r.month === month && 
            r.sectionId === paymentSectionId
        );

        if (!attendanceRecord) {
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            const selectedSection = sections.find(s => s.id === paymentSectionId);
            const sectionName = selectedSection ? selectedSection.name : "Selected Section";
            setModalErrorMessage(`Please mark the attendance of ${sectionName} for ${monthName} first.`);
            return;
        }

        // Fetch employees for the selected section
        const sectionEmployees = await db.getEmployeesBySection(paymentSectionId);
        if (!sectionEmployees || sectionEmployees.length === 0) {
            setModalErrorMessage("No employees found for the selected section.");
            return;
        }

        // Fetch prepayments for the payment period
        const allPrepayments = await db.getPrepayments();
        const periodPrepayments = allPrepayments.filter(p => p.month === paymentPeriod);

        // Generate the Excel file
        await generatePaymentDetailsExcel(attendanceRecord, paymentPeriod, sectionEmployees, sections, groups, periodPrepayments);

        setIsPaymentModalOpen(false);
        setSuccessMessage("Payment details Excel file generated successfully!");
        setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error: any) {
        console.error(error);
        setModalErrorMessage(error.message || "An unexpected error occurred during Excel generation.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Files</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automate monthly reports and payment sheets.</p>
      </div>

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded relative flex items-center gap-2 animate-pulse">
           <CheckCircle size={20} />
           <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2 animate-pulse">
           <XCircle size={20} />
           <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300 font-medium text-sm">
            <Filter size={16} /> <span>Select Data to Include</span>
            {(searchTerm || filterSectionId || filterGroupId) && (
                <button onClick={clearFilters} className="ml-auto text-xs text-dns-red hover:underline flex items-center gap-1"><X size={12} /> Clear All</button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search Employees</label>
                 <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                    <input type="text" placeholder="Name, NIC, or Emp No" className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-dns-red focus:border-dns-red sm:text-sm py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
            </div>
            <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filter by Section</label>
                 <select className="block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-dns-red focus:border-dns-red sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={filterSectionId} onChange={(e) => { setFilterSectionId(e.target.value); setFilterGroupId(''); }}>
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
            </div>
            <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filter by Group</label>
                 <select className="block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-dns-red focus:border-dns-red sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}>
                    <option value="">All Groups</option>
                    {filterAvailableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                 </select>
            </div>
        </div>
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-right">
            Selected Records: <span className="font-bold text-gray-900 dark:text-white">{filteredEmployees.length}</span>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Employee List Export Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                      <FileSpreadsheet size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Employee List</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                      Export the currently filtered list of employees to an Excel file with detailed information.
                  </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                   <Button onClick={handleExport} disabled={isProcessing} isLoading={isProcessing} icon={<Download size={16} />} className="w-full">
                      Download Excel
                  </Button>
              </div>
          </div>

          {/* Payment Details Export Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <FileSpreadsheet size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Payment Details</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generate and download a payment details report for a specific section and period.
                </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                 <Button onClick={() => setIsPaymentModalOpen(true)} icon={<Download size={16} />} className="w-full">
                    Generate Excel
                </Button>
            </div>
          </div>
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
            setIsPaymentModalOpen(false);
            setModalErrorMessage(''); // Clear error on close
        }}
        title="Generate Payment Details"
      >
        <div className="space-y-4">
            {modalErrorMessage && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
                <XCircle size={20} />
                <span className="font-medium">{modalErrorMessage}</span>
              </div>
            )}
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select Section</label>
                <select 
                    className="block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-dns-red focus:border-dns-red sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={paymentSectionId} 
                    onChange={(e) => setPaymentSectionId(e.target.value)}
                >
                    <option value="">Select a Section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select Period</label>
                <input 
                    type="month"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-dns-red focus:border-dns-red sm:text-sm py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={paymentPeriod}
                    onChange={(e) => setPaymentPeriod(e.target.value)}
                />
            </div>
            <div className="pt-4 flex justify-end">
                <Button onClick={handlePaymentDownload} disabled={isProcessing} isLoading={isProcessing} icon={<Download size={16} />}>
                    Download Excel
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default GenerateFiles;
