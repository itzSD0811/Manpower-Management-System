import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', zIndex = 'z-50' }) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses: { [key: string]: string } = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    full: 'sm:max-w-full',
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.lg;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-gray-200 bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>

      <div
        className={`relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${maxWidthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
