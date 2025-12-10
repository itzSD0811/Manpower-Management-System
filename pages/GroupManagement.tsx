import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, XCircle, Banknote, Calendar } from 'lucide-react';
import { GroupEntity, SectionEntity, SalaryRecord } from '../types';
import db from '../services/db';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { canUserEditPage } from '../services/permissionService';

const GroupManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<GroupEntity[]>([]);
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  
  // Create/Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<GroupEntity>>({});
  const [initialSalary, setInitialSalary] = useState<{amount: string, month: string}>({ amount: '', month: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Salary Management Modal States
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupEntity | null>(null);
  const [newSalaryRecord, setNewSalaryRecord] = useState<{amount: string, month: string}>({ amount: '', month: '' });

  // Notification States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Delete State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({ 
    isOpen: false, id: null, name: '' 
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
    checkPermissions();
  }, [currentUser]);

  const checkPermissions = async () => {
    if (currentUser?.uid) {
      const hasEdit = await canUserEditPage(currentUser.uid, 'groups');
      setCanEdit(hasEdit);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    const [groupsData, sectionsData] = await Promise.all([db.getGroups(), db.getSections()]);
    
    setGroups(groupsData);
    setSections(sectionsData);
    setIsLoading(false);
  };

  // --- Helpers ---
  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || 'Unknown';
  
  const getCurrentMonthSalary = (group: GroupEntity): number | null => {
    if (!group.salaryHistory || group.salaryHistory.length === 0) return null;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const record = group.salaryHistory.find(r => r.month === currentMonth);
    
    if (record) return record.amount;
    
    // Fallback: Find most recent past salary
    const sorted = [...group.salaryHistory].sort((a, b) => b.month.localeCompare(a.month));
    const pastRec = sorted.find(r => r.month <= currentMonth);
    return pastRec ? pastRec.amount : null;
  };

  // --- Handlers: Create/Edit Group Basic Info ---

  const handleOpenCreate = () => {
    setFormData({});
    setInitialSalary({ amount: '', month: new Date().toISOString().slice(0, 7) }); // Default to current month
    setIsEditMode(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: GroupEntity) => {
    setFormData({ ...group });
    setIsEditMode(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const suggestedId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, name, codeId: suggestedId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.codeId || !formData.sectionId) {
      setFormError('Name, ID and Section are required.');
      return;
    }
    
    const exists = groups.some(g => g.codeId === formData.codeId && g.id !== formData.id);
    if (exists) {
        setFormError('Group ID already exists.');
        return;
    }

    setIsSaving(true);
    setFormError('');

    const finalGroup = { ...formData };

    // Assign a new ID if it's a new record
    if (!isEditMode) {
      finalGroup.id = crypto.randomUUID();
    }
    
    // Construct the object
    const history = finalGroup.salaryHistory || [];
    
    // If creating new, add the initial salary input to history
    if (!isEditMode && initialSalary.amount && initialSalary.month) {
        const newRecord = { 
            month: initialSalary.month, 
            amount: Number(initialSalary.amount) 
        };
        // Avoid duplicates on re-submit
        if (!history.some(h => h.month === newRecord.month)) {
            history.push(newRecord);
        }
    }
    finalGroup.salaryHistory = history;


    try {
      await db.saveGroup(finalGroup as GroupEntity);
      setIsModalOpen(false);
      loadData();

      setSuccessMessage(isEditMode ? "Group updated successfully!" : "Group created successfully!");
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "An unknown error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers: Salary Management ---

  const handleOpenSalaryManager = (group: GroupEntity) => {
      setSelectedGroup(group);
      setNewSalaryRecord({ amount: '', month: new Date().toISOString().slice(0, 7) });
      setSalaryModalOpen(true);
  };

  const handleAddSalary = async () => {
      if (!selectedGroup || !newSalaryRecord.amount || !newSalaryRecord.month) return;
      
      const newHistory = [...selectedGroup.salaryHistory];
      
      // Remove existing record for same month if exists (overwrite)
      const existingIdx = newHistory.findIndex(r => r.month === newSalaryRecord.month);
      if (existingIdx >= 0) {
          newHistory.splice(existingIdx, 1);
      }
      
      newHistory.push({
          month: newSalaryRecord.month,
          amount: Number(newSalaryRecord.amount)
      });
      
      // Sort descending
      newHistory.sort((a, b) => b.month.localeCompare(a.month));

      const updatedGroup = { ...selectedGroup, salaryHistory: newHistory };
      
      try {
          setIsSaving(true);
          await db.saveGroup(updatedGroup);
          setSelectedGroup(updatedGroup); // Update local modal state
          // Update main list
          setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
          setNewSalaryRecord({ ...newSalaryRecord, amount: '' }); // Clear amount, keep month
      } catch (e) {
          console.error(e);
          alert("Failed to save salary.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteSalary = async (monthToDelete: string) => {
      if (!selectedGroup) return;
      const newHistory = selectedGroup.salaryHistory.filter(r => r.month !== monthToDelete);
      const updatedGroup = { ...selectedGroup, salaryHistory: newHistory };

      try {
        setIsSaving(true);
        await db.saveGroup(updatedGroup);
        setSelectedGroup(updatedGroup);
        setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    } catch (e) {
        console.error(e);
        alert("Failed to delete salary record.");
    } finally {
        setIsSaving(false);
    }
  };


  // --- Handlers: Delete Group ---
  
  const handleVerifyDelete = async (group: GroupEntity) => {
    setVerifyingId(group.id);
    setErrorMessage('');

    try {
        const allEmployees = await db.getEmployees();
        const associatedEmployees = allEmployees.filter(e => e.groupId === group.id);

        if (associatedEmployees.length > 0) {
            setErrorMessage(`Cannot delete '${group.name}'. It has ${associatedEmployees.length} associated employee(s). Please reassign them first.`);
            setVerifyingId(null);
            setTimeout(() => setErrorMessage(''), 8000);
            return;
        }

        setDeleteModal({ isOpen: true, id: group.id, name: group.name });
    } catch (error) {
        console.error("Dependency check failed:", error);
        setErrorMessage("Failed to verify dependencies. Please check connection.");
    } finally {
        setVerifyingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;

    setIsDeleting(true);
    try {
        await db.deleteGroup(deleteModal.id);
        setSuccessMessage("Group deleted successfully.");
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Group Definitions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage groups and monthly salary structures.</p>
        </div>
        {canEdit && (
          <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>
            Create New Group
          </Button>
        )}
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

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
             <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading data...</div>
        ) : (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parent Section</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Month Salary</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No groups defined yet.</td>
              </tr>
            ) : (
              groups.map((grp) => {
                const currentSalary = getCurrentMonthSalary(grp);
                return (
                  <tr key={grp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{grp.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{grp.codeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                            {getSectionName(grp.sectionId)}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {currentSalary ? (
                          <span className="text-green-600 dark:text-green-400">{currentSalary.toLocaleString()} LKR</span>
                      ) : (
                          <span className="text-gray-400 italic">Not set for {new Date().toLocaleDateString('default', { month: 'short' })}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canEdit && (
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenSalaryManager(grp); }}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                                title="Manage Salaries"
                            >
                                <Banknote size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(grp); }}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleVerifyDelete(grp); }}
                                className={`text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 ${verifyingId === grp.id ? 'opacity-50' : ''}`}
                                disabled={verifyingId === grp.id}
                            >
                              {verifyingId === grp.id ? (
                                    <svg className="animate-spin h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <Trash2 size={16} />
                                )}
                            </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Main Group Config Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Group Details" : "Create New Group"}
      >
        <form onSubmit={handleSubmit}>
          <Select
            label="Parent Section"
            value={formData.sectionId || ''}
            onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
            options={sections.map(s => ({ value: s.id, label: s.name }))}
            required
          />
          <Input
            label="Group Name"
            placeholder="e.g. Senior Electrician 2"
            value={formData.name || ''}
            onChange={handleNameChange}
            required
          />
          <Input
            label="Group ID"
            placeholder="e.g. sr_electrician_2"
            helperText="Auto-generated."
            value={formData.codeId || ''}
            onChange={(e) => setFormData({ ...formData, codeId: e.target.value.toLowerCase() })}
            error={formError}
            required
          />
          
          {/* Only show initial salary inputs on creation to keep edit simple */}
          {!isEditMode && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Banknote size={16} /> Initial Salary Setup
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                    label="Starting Salary"
                    type="number"
                    placeholder="0.00"
                    value={initialSalary.amount}
                    onChange={(e) => setInitialSalary({ ...initialSalary, amount: e.target.value })}
                    required
                    />
                    <Input
                    label="Start Month"
                    type="month"
                    value={initialSalary.month}
                    onChange={(e) => setInitialSalary({ ...initialSalary, month: e.target.value })}
                    required
                    />
                </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{isEditMode ? "Update Details" : "Create Group"}</Button>
          </div>
        </form>
      </Modal>

      {/* Salary Management Modal */}
      <Modal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        title={`Manage Salaries: ${selectedGroup?.name}`}
      >
        <div className="space-y-6">
            {/* Add New Record Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add / Update Monthly Salary</h4>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Month</label>
                        <input 
                            type="month" 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={newSalaryRecord.month}
                            onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, month: e.target.value })}
                        />
                    </div>
                    <div className="flex-1">
                         <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (LKR)</label>
                        <input 
                            type="number" 
                            placeholder="50000"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={newSalaryRecord.amount}
                            onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, amount: e.target.value })}
                        />
                    </div>
                    <Button onClick={handleAddSalary} isLoading={isSaving} icon={<Plus size={16} />}>
                        Save
                    </Button>
                </div>
            </div>

            {/* History List */}
            <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Calendar size={16} /> Salary History
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Month</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                                <th className="px-4 py-2 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {selectedGroup?.salaryHistory?.length === 0 ? (
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">No salary records found.</td></tr>
                            ) : (
                                selectedGroup?.salaryHistory?.map((rec) => (
                                    <tr key={rec.month}>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium">{rec.month}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{rec.amount.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button 
                                                onClick={() => handleDeleteSalary(rec.month)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                disabled={isSaving}
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </Modal>

       {/* Delete Confirmation Modal */}
       <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md flex items-start gap-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Permanent Action</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                    </p>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
                <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                    disabled={isDeleting}
                >
                    Cancel
                </Button>
                <Button 
                    type="button" 
                    variant="danger" 
                    onClick={handleConfirmDelete} 
                    isLoading={isDeleting}
                    icon={<Trash2 size={16} />}
                >
                    Delete Permanently
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupManagement;
