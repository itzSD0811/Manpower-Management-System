
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Search, X, Filter, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { EmployeeEntity, SectionEntity, GroupEntity } from '../types';
import db from '../services/db';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeEntity[]>([]);
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [groups, setGroups] = useState<GroupEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  
  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeEntity>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  // Delete State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({ 
    isOpen: false, id: null, name: '' 
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleOpenCreate = () => {
    setFormData({});
    setIsEditMode(false);
    setIsModalOpen(true);
    setErrorMessage('');
    setModalErrorMessage('');
  };

  const handleOpenEdit = (emp: EmployeeEntity) => {
    setFormData({ ...emp });
    setIsEditMode(true);
    setIsModalOpen(true);
    setErrorMessage('');
    setModalErrorMessage('');
  };

  // Step 1: Open Delete Modal
  const handleOpenDelete = (emp: EmployeeEntity) => {
    setDeleteModal({ isOpen: true, id: emp.id, name: emp.fullName });
    setErrorMessage('');
  };

  // Step 2: Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;

    setIsDeleting(true);
    try {
        await db.deleteEmployee(deleteModal.id);
        setSuccessMessage("Employee deleted successfully.");
        setDeleteModal({ isOpen: false, id: null, name: '' });
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
        console.error("Delete failed:", error);
        setErrorMessage(`Failed to delete: ${error.message || "Unknown error"}`);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrorMessage(''); // Clear previous errors

    if (!formData.fullName || !formData.nic || !formData.employeeNumber || !formData.sectionId || !formData.groupId) {
      setModalErrorMessage("Please fill all required fields");
      return;
    }

    // Validation for phone number
    if (formData.phoneNumber && !/^\d+$/.test(formData.phoneNumber)) {
        setModalErrorMessage("Phone number must be numeric.");
        return;
    }

    // Validation for unique employee number
    const isDuplicate = employees.some(
        emp => emp.employeeNumber === formData.employeeNumber && emp.id !== formData.id
    );

    if (isDuplicate) {
        setModalErrorMessage("Employee number already exists.");
        return;
    }
    
    setIsSaving(true);
    
    const finalFormData = { ...formData };
    if (!isEditMode) {
      finalFormData.id = crypto.randomUUID();
    }

    try {
      await db.saveEmployee(finalFormData as EmployeeEntity);
      setIsModalOpen(false);
      loadData();
      
      setSuccessMessage(isEditMode ? "Employee updated successfully!" : "Employee registered successfully!");
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setModalErrorMessage(err.message || "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
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

  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || '-';
  const getGroupName = (id: string) => groups.find(g => g.id === id)?.name || '-';
  const modalAvailableGroups = groups.filter(g => g.sectionId === formData.sectionId);
  const filterAvailableGroups = filterSectionId ? groups.filter(g => g.sectionId === filterSectionId) : groups;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Register new staff and manage employee profiles.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>Register Employee</Button>
        </div>
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
            <Filter size={16} /> <span>Filters</span>
            {(searchTerm || filterSectionId || filterGroupId) && (
                <button onClick={clearFilters} className="ml-auto text-xs text-dns-red hover:underline flex items-center gap-1"><X size={12} /> Clear All</button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
                 <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                    <input type="text" placeholder="Name, NIC, or Emp No" className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-dns-red focus:border-dns-red sm:text-sm py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
            </div>
            <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</label>
                 <select className="block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-dns-red focus:border-dns-red sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={filterSectionId} onChange={(e) => { setFilterSectionId(e.target.value); setFilterGroupId(''); }}>
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
            </div>
            <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Group</label>
                 <select className="block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-dns-red focus:border-dns-red sm:text-sm rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}>
                    <option value="">All Groups</option>
                    {filterAvailableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                 </select>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
        {isLoading ? (
             <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading data...</div>
        ) : (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Emp No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NIC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section / Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEmployees.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No employees found.</td></tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{emp.employeeNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{emp.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.nic}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="text-gray-900 dark:text-gray-200">{getSectionName(emp.sectionId)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getGroupName(emp.groupId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {emp.joinedDate ? emp.joinedDate.split('T')[0] : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.phoneNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(emp); }} className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                            <Edit size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenDelete(emp); }} className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Employee" : "Register Employee"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {modalErrorMessage && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center gap-2">
                    <XCircle size={20} />
                    <span className="font-medium">{modalErrorMessage}</span>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Section" value={formData.sectionId || ''} onChange={(e) => setFormData({ ...formData, sectionId: e.target.value, groupId: '' })} options={sections.map(s => ({ value: s.id, label: s.name }))} required />
                <Select label="Group" value={formData.groupId || ''} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })} options={modalAvailableGroups.map(g => ({ value: g.id, label: g.name }))} disabled={!formData.sectionId} placeholder="Select Group" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Emp No" placeholder="e.g. 1004" value={formData.employeeNumber || ''} onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })} required />
                 <Input label="NIC" placeholder="National ID" value={formData.nic || ''} onChange={(e) => setFormData({ ...formData, nic: e.target.value })} required />
            </div>
            <Input label="Full Name" value={formData.fullName || ''} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Input label="Phone" value={formData.phoneNumber || ''} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
                 <Input label="Joined Date" type="date" value={(formData.joinedDate && formData.joinedDate.split('T')[0]) || ''} onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })} />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" isLoading={isSaving}>{isEditMode ? "Update" : "Register"}</Button>
            </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} title="Confirm Deletion">
        <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md flex items-start gap-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Permanent Action</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} disabled={isDeleting}>Cancel</Button>
                <Button type="button" variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting} icon={<Trash2 size={16} />}>Delete Permanently</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
