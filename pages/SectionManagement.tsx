
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { SectionEntity } from '../types';
import db from '../services/db';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SectionEntity>>({});
  const [formError, setFormError] = useState(''); // Errors inside the modal form
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Errors shown on the main page

  // Delete State
  const [verifyingId, setVerifyingId] = useState<string | null>(null); // Loading state for dependency check
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({ 
    isOpen: false, id: null, name: '' 
  });
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for actual deletion

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await db.getSections();
    setSections(data);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    setFormData({});
    setIsEditMode(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (section: SectionEntity) => {
    setFormData({ ...section });
    setIsEditMode(true);
    setFormError('');
    setIsModalOpen(true);
  };

  // Step 1: Verify Dependencies
  const handleVerifyDelete = async (section: SectionEntity) => {
    setVerifyingId(section.id);
    setErrorMessage(''); // Clear previous errors

    try {
        const [allGroups, allEmployees] = await Promise.all([db.getGroups(), db.getEmployees()]);
        
        const associatedGroups = allGroups.filter(g => g.sectionId === section.id);
        const associatedEmployees = allEmployees.filter(e => e.sectionId === section.id);

        if (associatedGroups.length > 0) {
            const names = associatedGroups.map(g => g.name).slice(0, 3).join(', ');
            setErrorMessage(`Cannot delete '${section.name}'. It is used by ${associatedGroups.length} groups (${names}${associatedGroups.length > 3 ? '...' : ''}). Please remove these groups first.`);
            setVerifyingId(null);
            setTimeout(() => setErrorMessage(''), 8000);
            return;
        }
        
        if (associatedEmployees.length > 0) {
            setErrorMessage(`Cannot delete '${section.name}'. It is assigned to ${associatedEmployees.length} employees. Please reassign them first.`);
            setVerifyingId(null);
            setTimeout(() => setErrorMessage(''), 8000);
            return;
        }

        // Safe to delete: Open Confirmation Modal
        setDeleteModal({ isOpen: true, id: section.id, name: section.name });
    } catch (error) {
        console.error("Dependency check failed:", error);
        setErrorMessage("Failed to verify dependencies. Please check connection.");
    } finally {
        setVerifyingId(null);
    }
  };

  // Step 2: Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    
    setIsDeleting(true);
    try {
        await db.deleteSection(deleteModal.id);
        setSuccessMessage("Section deleted successfully.");
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
    if (!formData.name || !formData.codeId) {
      setFormError('All fields are required.');
      return;
    }

    const exists = sections.some(s => s.codeId === formData.codeId && s.id !== formData.id);
    if (exists) {
        setFormError('Section ID already exists.');
        return;
    }

    setIsSaving(true);
    setFormError(''); // Clear previous errors

    // Assign a new ID if it's a new record
    const finalFormData = { ...formData };
    if (!isEditMode) {
      finalFormData.id = crypto.randomUUID();
    }

    try {
      await db.saveSection(finalFormData as SectionEntity);
      setIsModalOpen(false);
      loadData(); // Reload data to show the new/updated item
      
      setSuccessMessage(isEditMode ? "Section updated successfully!" : "Section created successfully!");
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      // Display the actual error message from the backend
      setFormError(err.message || "An unknown error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const suggestedId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, name, codeId: suggestedId });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Section Definitions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage organizational sections (e.g., Technical, Admin).</p>
        </div>
        <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>
          Create New Section
        </Button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section ID</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sections.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No sections defined yet.</td>
              </tr>
            ) : (
              sections.map((section) => (
                <tr key={section.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{section.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{section.codeId}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(section); }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                          disabled={verifyingId === section.id}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleVerifyDelete(section); }}
                          className={`text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 ${verifyingId === section.id ? 'opacity-50' : ''}`}
                          disabled={verifyingId === section.id}
                      >
                         {verifyingId === section.id ? (
                            <svg className="animate-spin h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : (
                            <Trash2 size={16} />
                         )}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Section" : "Create New Section"}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Section Name"
            placeholder="e.g. Technical Staff 1"
            value={formData.name || ''}
            onChange={handleNameChange}
            required
          />
          <Input
            label="Section ID"
            placeholder="e.g. tech_staff_1"
            helperText="Auto-generated. Lowercase letters, numbers, and underscores only."
            value={formData.codeId || ''}
            onChange={(e) => setFormData({ ...formData, codeId: e.target.value.toLowerCase() })}
            error={formError}
            required
          />
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{isEditMode ? "Update" : "Save"}</Button>
          </div>
        </form>
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

export default SectionManagement;
