
import React from 'react';
import { useQuotations, useDeleteQuotation } from '@/hooks/useQuotations';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const QuotationTestHelper = () => {
  const { data: quotations = [] } = useQuotations();
  const deleteQuotationMutation = useDeleteQuotation();

  const testDelete = async () => {
    if (quotations.length === 0) {
      toast.error('No quotations available to test delete');
      return;
    }

    const firstQuotation = quotations[0];
    console.log('Testing delete for quotation:', firstQuotation.id);
    
    try {
      await deleteQuotationMutation.mutateAsync(firstQuotation.id);
      toast.success('Delete test successful!');
    } catch (error) {
      console.error('Delete test failed:', error);
      toast.error(`Delete test failed: ${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Delete Functionality Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        Available quotations: {quotations.length}
      </p>
      <Button 
        onClick={testDelete}
        variant="destructive"
        disabled={quotations.length === 0 || deleteQuotationMutation.isPending}
      >
        {deleteQuotationMutation.isPending ? 'Testing...' : 'Test Delete First Quotation'}
      </Button>
    </div>
  );
};
