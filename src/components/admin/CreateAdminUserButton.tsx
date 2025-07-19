
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useAdminCreation } from '@/hooks/useAdminCreation';

export const CreateAdminUserButton = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { createAdminUser } = useAdminCreation();

  const handleCreateAdmin = async () => {
    setIsCreating(true);
    try {
      await createAdminUser('gavaskar', 'gavaskar@gmail.com', '123456789');
    } catch (error) {
      console.error('Failed to create admin user:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateAdmin}
      disabled={isCreating}
      className="w-full gap-2"
    >
      <UserPlus className="h-4 w-4" />
      {isCreating ? 'Creating Admin User...' : 'Create Admin User (gavaskar)'}
    </Button>
  );
};
