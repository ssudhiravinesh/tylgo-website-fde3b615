import { useWorkerData } from './useWorkerData';
import { useWorkerMutations } from './useWorkerMutations';
import { useWorkerQuotations } from './useWorkerQuotations';

export const useWorkerManagement = () => {
  const { workers, quotationStats, isLoading } = useWorkerData();
  const { resetPasswordMutation, addWorkerMutation, deleteWorkerMutation } = useWorkerMutations();
  const { workerQuotations, fetchWorkerQuotations } = useWorkerQuotations();

  return {
    workers,
    workerQuotations,
    quotationStats,
    isLoading,
    resetPasswordMutation,
    addWorkerMutation,
    deleteWorkerMutation,
    fetchWorkerQuotations,
  };
};

// Re-export types for backward compatibility
export type { Worker, QuotationStats } from './useWorkerData';
export type { WorkerQuotation } from './useWorkerQuotations';