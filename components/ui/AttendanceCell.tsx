import React from 'react';
import { Sun, Sunrise, Moon, MoonStar } from 'lucide-react';

export type AttendanceStatus = {
  day: boolean;
  night: boolean;
  dayHalf: boolean;
  nightHalf: boolean;
};

interface AttendanceCellProps {
  status: AttendanceStatus;
  onChange: (newStatus: AttendanceStatus) => void;
}

const AttendanceCell: React.FC<AttendanceCellProps> = ({ status, onChange }) => {
  const handleToggle = (key: keyof AttendanceStatus) => {
    let newStatus: AttendanceStatus = { ...status };

    // Toggle the value
    newStatus[key] = !newStatus[key];

    // Apply constraints
    if (key === 'day' && newStatus.day) newStatus.dayHalf = false;
    if (key === 'dayHalf' && newStatus.dayHalf) newStatus.day = false;
    if (key === 'night' && newStatus.night) newStatus.nightHalf = false;
    if (key === 'nightHalf' && newStatus.nightHalf) newStatus.night = false;

    onChange(newStatus);
  };

  const getButtonClass = (isActive: boolean) =>
    `w-6 h-6 flex items-center justify-center rounded-sm transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
    }`;

  return (
    <div className="flex gap-0.5">
      <button onClick={() => handleToggle('day')} className={getButtonClass(status.day)} title="Day"><Sun size={16} /></button>
      <button onClick={() => handleToggle('dayHalf')} className={getButtonClass(status.dayHalf)} title="Day Half"><Sunrise size={16} /></button>
      <button onClick={() => handleToggle('night')} className={getButtonClass(status.night)} title="Night"><Moon size={16} /></button>
      <button onClick={() => handleToggle('nightHalf')} className={getButtonClass(status.nightHalf)} title="Night Half"><MoonStar size={16} /></button>
    </div>
  );
};

export default AttendanceCell;
