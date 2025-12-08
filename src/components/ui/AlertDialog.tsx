import React from 'react';
import { X } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
}) => {
  if (!isOpen) return null;

  const bgColor = {
    error: 'bg-red-50',
    warning: 'bg-yellow-50',
    success: 'bg-green-50',
    info: 'bg-blue-50',
  }[type];

  const textColor = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
    info: 'text-blue-600',
  }[type];

  const borderColor = {
    error: 'border-red-200',
    warning: 'border-yellow-200',
    success: 'border-green-200',
    info: 'border-blue-200',
  }[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${bgColor} border-b ${borderColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${textColor}`}>
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-700">
                    {message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="ml-4 inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                <span className="sr-only">Fechar</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className={`mt-3 inline-flex w-full justify-center rounded-md border ${borderColor} bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm`}
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
