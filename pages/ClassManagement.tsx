import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { SectionEntity } from '../types';
import db from '../services/db';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SectionEntity>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await db.getSections();
    setSections(data);
  };

  const handleOpenModal = () => {
    setFormData({});
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.codeId) {
      setError('All fields are required.');
      return;
    }

    if (!db.validateCodeId(formData.codeId)) {
      setError('Section ID must only contain lowercase letters and underscores (e.g., tech_staff).');
      return;
    }

    // Check for unique ID
    const exists = sections.some(c => c.codeId === formData.codeId);
    if (exists) {
        setError('Section ID already exists.');
        return;
    }

    await db.saveSection(formData as SectionEntity);
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Section Definitions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage organizational sections (e.g., Technical, Admin).</p>
        </div>
        <Button onClick={handleOpenModal} icon={<Plus size={16} />}>
          Create New Section
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sections.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                  No sections defined yet.
                </td>
              </tr>
            ) : (
              sections.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono bg-gray-50 inline-block m-2 rounded px-2">
                    {cls.codeId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Section"
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Section Name"
            placeholder="e.g. Technical Staff"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Section ID"
            placeholder="e.g. tech_staff"
            helperText="Lowercase letters and underscores only."
            value={formData.codeId || ''}
            onChange={(e) => setFormData({ ...formData, codeId: e.target.value.toLowerCase() })}
            error={error}
            required
          />
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Section
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SectionManagement;
