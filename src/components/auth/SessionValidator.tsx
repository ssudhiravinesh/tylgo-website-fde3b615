import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStrictSessionManagement } from '@/hooks/useStrictSessionManagement';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export const SessionValidator = ({ children }: SessionValidatorProps) => {
  const { user, profile } = useAuth();
  const { enforceSessionValidation } = useStrictSessionManagement();

  useEffect(() => {
    if (user && profile) {
      // Validate session when component mounts and user is authenticated
      enforceSessionValidation(user.id);
    }
  }, [user, profile, enforceSessionValidation]);

  return <>{children}</>;
};