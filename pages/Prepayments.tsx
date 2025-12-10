import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { Plus, Trash2, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import db from '../services/db';
import { PrepaymentEntity, EmployeeEntity, SectionEntity } from '../types';

const Prepayments: React.FC = () => {
  const [prepayments, setPrepayments] = useState<PrepaymentEntity[]>([]);
  const [employees, setEmployees] = useState<EmployeeEntity[]>([]);
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'salary_advance' | 'other' | null>(null);
  const [modalError, setModalError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; employeeName: string; amount: number }>({
    isOpen: false,
    id: '',
    employeeName: '',
    amount: 0
  });
  
  // Salary Advance form state
  const [salaryAdvanceMonth, setSalaryAdvanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployeesAdvance, setSelectedEmployeesAdvance] = useState<string[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  
  // Other prepayment form state
  const [otherMonth, setOtherMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployeeOther, setSelectedEmployeeOther] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherReason, setOtherReason] = useState('');
  
  // Filter states
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'salary_advance' | 'other'>('all');
  const [filterEmployee, setFilterEmployee] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prepaymentsData, employeesData, sectionsData] = await Promise.all([
        db.getPrepayments(),
        db.getEmployees(),
        db.getSections()
      ]);
      console.log('Loaded prepayments:', prepaymentsData);
      if (prepaymentsData.length > 0) {
        console.log('First prepayment sample:', prepaymentsData[0]);
        console.log('First prepayment ID:', prepaymentsData[0].id);
      }
      setPrepayments(prepaymentsData);
      setEmployees(employeesData);
      setSections(sectionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenSalaryAdvance = () => {
    setSalaryAdvanceMonth(new Date().toISOString().slice(0, 7));
    setSelectedEmployeesAdvance([]);
    setAdvanceAmount('');
    setModalError('');
    setActiveModal('salary_advance');
  };
  
  const handleOpenOther = () => {
    setOtherMonth(new Date().toISOString().slice(0, 7));
    setSelectedEmployeeOther('');
    setOtherAmount('');
    setOtherReason('');
    setModalError('');
    setActiveModal('other');
  };
  
  const handleCloseModal = () => {
    setActiveModal(null);
    setModalError('');
    setSelectedEmployeesAdvance([]);
    setSelectedEmployeeOther('');
    setAdvanceAmount('');
    setOtherAmount('');
    setOtherReason('');
  };
  
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeesAdvance(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const handleSubmitSalaryAdvance = async () => {
    if (selectedEmployeesAdvance.length === 0) {
      setModalError('Please select at least one employee.');
      return;
    }
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
      setModalError('Please enter a valid advance amount.');
      return;
    }
    
    setIsSaving(true);
    setModalError('');
    
    try {
      const amount = parseFloat(advanceAmount);
      const promises = selectedEmployeesAdvance.map(employeeId => 
        db.savePrepayment({
          id: '',
          type: 'salary_advance',
          month: salaryAdvanceMonth,
          employeeId,
          amount
        })
      );
      
      await Promise.all(promises);
      handleCloseModal();
      await loadData();
    } catch (error: any) {
      console.error('Failed to save salary advance:', error);
      setModalError(error.message || 'Failed to save salary advance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSubmitOther = async () => {
    if (!selectedEmployeeOther) {
      setModalError('Please select an employee.');
      return;
    }
    if (!otherAmount || parseFloat(otherAmount) <= 0) {
      setModalError('Please enter a valid prepayment amount.');
      return;
    }
    if (!otherReason.trim()) {
      setModalError('Please enter a reason.');
      return;
    }
    
    setIsSaving(true);
    setModalError('');
    
    try {
      await db.savePrepayment({
        id: '',
        type: 'other',
        month: otherMonth,
        employeeId: selectedEmployeeOther,
        amount: parseFloat(otherAmount),
        reason: otherReason.trim()
      });
      
      handleCloseModal();
      await loadData();
    } catch (error: any) {
      console.error('Failed to save other prepayment:', error);
      setModalError(error.message || 'Failed to save prepayment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = (prep: PrepaymentEntity) => {
    console.log('handleDelete called with prepayment:', prep);
    console.log('prep.id:', prep.id, 'type:', typeof prep.id);
    const keys = Object.keys(prep);
    console.log('All prep keys:', keys);
    console.log('Key values:', keys.map(key => `${key}: ${(prep as any)[key]}`));
    console.log('Full prepayment object:', JSON.stringify(prep, null, 2));
    
    // Try to find the ID field - it might be named differently
    const prepId = prep.id || (prep as any).ID || (prep as any).Id || (prep as any).prepaymentId;
    
    if (!prepId) {
      console.error('Prepayment has no ID! Full object:', prep);
      setModalError('Error: Prepayment ID is missing. Cannot delete.');
      return;
    }
    
    console.log('Found ID:', prepId);
    
    const employeeName = getEmployeeName(prep.employeeId);
    const deleteModalData = {
      isOpen: true,
      id: prepId,
      employeeName,
      amount: typeof prep.amount === 'number' ? prep.amount : parseFloat(prep.amount || '0')
    };
    console.log('Setting deleteModal:', deleteModalData);
    setDeleteModal(deleteModalData);
  };
  
  const handleConfirmDelete = async () => {
    console.log('handleConfirmDelete called', deleteModal);
    if (!deleteModal.id) {
      console.warn('No ID in deleteModal');
      return;
    }
    
    console.log('Starting delete for ID:', deleteModal.id);
    setIsDeleting(true);
    setModalError('');
    
    try {
      console.log('Calling db.deletePrepayment with ID:', deleteModal.id);
      await db.deletePrepayment(deleteModal.id);
      console.log('Delete successful');
      setDeleteModal({ isOpen: false, id: '', employeeName: '', amount: 0 });
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete prepayment:', error);
      setModalError(error.message || 'Failed to delete prepayment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.fullName || 'Unknown';
  };
  
  const getEmployeeNumber = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.employeeNumber || '-';
  };
  
  const filteredPrepayments = prepayments.filter(prep => {
    const matchMonth = filterMonth ? prep.month === filterMonth : true;
    const matchType = filterType === 'all' ? true : prep.type === filterType;
    const matchEmployee = filterEmployee ? prep.employeeId === filterEmployee : true;
    return matchMonth && matchType && matchEmployee;
  });
  
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    };
  }).reverse();
  
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prepayments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage salary advances and other prepayments.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenSalaryAdvance} icon={<Plus size={16} />}>
            + Salary Advance
          </Button>
          <Button onClick={handleOpenOther} icon={<Plus size={16} />} variant="secondary">
            + Other
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">All Months</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'salary_advance' | 'other')}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="all">All Types</option>
              <option value="salary_advance">Salary Advance</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>
          
          <Button variant="secondary" onClick={() => { setFilterMonth(''); setFilterType('all'); setFilterEmployee(''); }}>
            Clear Filters
          </Button>
        </div>
      </div>
      
      {/* Prepayments List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8">Loading prepayments...</td>
                </tr>
              ) : filteredPrepayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-500">No prepayments found.</td>
                </tr>
              ) : (
                filteredPrepayments.map(prep => {
                  const prepDate = new Date(prep.createdAt);
                  const monthDate = new Date(prep.month + '-01');
                  return (
                    <tr key={prep.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {prepDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        <div>{getEmployeeName(prep.employeeId)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">#{getEmployeeNumber(prep.employeeId)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prep.type === 'salary_advance'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {prep.type === 'salary_advance' ? 'Salary Advance' : 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        Rs. {typeof prep.amount === 'number' ? prep.amount.toFixed(2) : parseFloat(prep.amount || '0').toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                        {prep.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDelete(prep)}
                          className="bg-red-500 bg-opacity-20 text-red-700 hover:bg-red-600 hover:bg-opacity-30 dark:bg-red-400 dark:bg-opacity-20 dark:text-red-300 dark:hover:bg-red-500 dark:hover:bg-opacity-30"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Salary Advance Modal */}
      <Modal isOpen={activeModal === 'salary_advance'} onClose={handleCloseModal} title="Add Salary Advance" size="lg">
        <div className="space-y-4">
          {modalError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{modalError}</span>
            </div>
          )}
          
          <Select
            label="Month"
            value={salaryAdvanceMonth}
            onChange={(e) => setSalaryAdvanceMonth(e.target.value)}
            options={months.map(m => ({ value: m.value, label: m.label }))}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Employees (Multiple Selection)
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No employees available.</p>
              ) : (
                employees.map(emp => (
                  <label key={emp.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployeesAdvance.includes(emp.id)}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="mr-3 h-4 w-4 text-dns-red focus:ring-dns-red border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{emp.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">#{emp.employeeNumber}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedEmployeesAdvance.length > 0 && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedEmployeesAdvance.length} employee(s) selected
              </p>
            )}
          </div>
          
          <Input
            label="Advance Amount"
            type="number"
            step="0.01"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            placeholder="Enter advance amount"
            required
          />
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmitSalaryAdvance} isLoading={isSaving}>
            Submit
          </Button>
        </div>
      </Modal>
      
      {/* Other Prepayment Modal */}
      <Modal isOpen={activeModal === 'other'} onClose={handleCloseModal} title="Add Other Prepayment" size="lg">
        <div className="space-y-4">
          {modalError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{modalError}</span>
            </div>
          )}
          
          <Select
            label="Month"
            value={otherMonth}
            onChange={(e) => setOtherMonth(e.target.value)}
            options={months.map(m => ({ value: m.value, label: m.label }))}
          />
          
          <Select
            label="Employee"
            value={selectedEmployeeOther}
            onChange={(e) => setSelectedEmployeeOther(e.target.value)}
            options={employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (#${emp.employeeNumber})` }))}
            placeholder="Select Employee"
            required
          />
          
          <Input
            label="Prepayment Amount"
            type="number"
            step="0.01"
            value={otherAmount}
            onChange={(e) => setOtherAmount(e.target.value)}
            placeholder="Enter prepayment amount"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Enter reason for prepayment"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
              required
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmitOther} isLoading={isSaving}>
            Submit
          </Button>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} 
        title="Confirm Deletion"
        size="md"
      >
        <div className="space-y-4">
          {modalError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{modalError}</span>
            </div>
          )}
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Permanent Action</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Are you sure you want to delete the prepayment for <strong>{deleteModal.employeeName}</strong> (Rs. {deleteModal.amount.toFixed(2)})? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setDeleteModal({ ...deleteModal, isOpen: false });
                setModalError('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked (native), deleteModal:', deleteModal);
                if (!deleteModal.id) {
                  console.error('No ID in deleteModal!');
                  setModalError('Error: No prepayment ID found. Please try again.');
                  return;
                }
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 px-4 py-2 text-sm"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Prepayments;

