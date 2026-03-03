import React from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string | string[];
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-600" size={48} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={48} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-600" size={48} />;
      case 'info':
      default:
        return <Info className="text-blue-600" size={48} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const colors = getColors();
  const messages = Array.isArray(message) ? message : [message];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-fadeIn">
        <div className={`${colors.bg} ${colors.border} border-b px-6 py-4 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <h2 className="text-xl font-bold text-gray-900">
                {title || (type === 'success' ? 'Sucesso' : 
                           type === 'error' ? 'Erro' : 
                           type === 'warning' ? 'Aviso' : 'Informação')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <p key={idx} className="text-gray-700 leading-relaxed">
                {msg}
              </p>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className={`${colors.button} text-white px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
