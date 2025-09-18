import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface WithDepartmentAccessProps {
  allowedDepartments?: string[];
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  children: React.ReactNode;
}

/**
 * Higher-Order Component to control access based on user department and role
 * @param {Object} props - Component props
 * @param {string[]} [props.allowedDepartments] - Array of department IDs that are allowed to access the content
 * @param {string[]} [props.allowedRoles] - Array of roles that are allowed to access the content
 * @param {boolean} [props.requireSuperAdmin] - If true, only super admins can access
 * @param {React.ReactNode} props.children - Child components to render if access is granted
 */
const WithDepartmentAccess: React.FC<WithDepartmentAccessProps> = ({
  allowedDepartments = [],
  allowedRoles = [],
  requireSuperAdmin = false,
  children
}) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // If no user is logged in, redirect to login
  if (!userProfile) {
    navigate('/login');
    return null;
  }

  // Check if user is a super admin (admin with no department)
  const isSuperAdmin = userProfile.role === 'admin' && !userProfile.departamento_id;
  
  // If super admin is required, only allow super admins
  if (requireSuperAdmin) {
    return isSuperAdmin ? <>{children}</> : null;
  }

  // Check if user has one of the allowed roles
  const hasAllowedRole = allowedRoles.length === 0 || allowedRoles.includes(userProfile.role);
  
  // Check if user is in one of the allowed departments
  const isInAllowedDepartment = allowedDepartments.length === 0 || 
    (userProfile.departamento_id && allowedDepartments.includes(userProfile.departamento_id));

  // If user is a super admin, they have access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // If user has the required role and department access, render children
  if (hasAllowedRole && isInAllowedDepartment) {
    return <>{children}</>;
  }

  // Default: no access
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="text-center p-6 max-w-md bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Restrito</h3>
        <p className="text-gray-600 mb-4">
          Você não tem permissão para acessar esta página.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voltar para o Início
        </button>
      </div>
    </div>
  );
};

export default WithDepartmentAccess;
