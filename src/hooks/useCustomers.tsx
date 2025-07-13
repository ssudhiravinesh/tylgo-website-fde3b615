
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { supabase } from '@/integrations/supabase/client';
// import { toast } from 'sonner';

// export interface Customer {
//   id: string;
//   name: string;
//   mobile: string;
//   address?: string;
//   reference_name?: string;
//   reference_mobile_no?: string;
//   attended_by?: string;
//   created_at?: string;
//   updated_at?: string;
// }

// export interface CreateCustomerData {
//   name: string;
//   mobile: string;
//   address?: string;
//   reference_name?: string;
//   reference_mobile_no?: string;
//   attended_by?: string;
// }

// export const useCustomers = () => {
//   const queryClient = useQueryClient();

//   const {
//     data: customers = [],
//     isLoading,
//     error,
//     refetch
//   } = useQuery({
//     queryKey: ['customers'],
//     queryFn: async () => {
//       console.log('Fetching customers...');
//       const { data, error } = await supabase
//         .from('customers')
//         .select('*')
//         .order('created_at', { ascending: false });

//       if (error) {
//         console.error('Error fetching customers:', error);
//         throw error;
//       }

//       console.log('Customers fetched:', data?.length || 0);
//       return data as Customer[];
//     },
//   });

//   const createCustomerMutation = useMutation({
//     mutationFn: async (customerData: CreateCustomerData) => {
//       console.log('Creating customer:', customerData);
//       const { data, error } = await supabase
//         .from('customers')
//         .insert([customerData])
//         .select()
//         .single();

//       if (error) {
//         console.error('Error creating customer:', error);
//         throw error;
//       }

//       console.log('Customer created:', data);
//       return data as Customer;
//     },
//     onSuccess: (data) => {
//       queryClient.invalidateQueries({ queryKey: ['customers'] });
//       toast.success(`Customer "${data.name}" created successfully!`);
//     },
//     onError: (error: any) => {
//       console.error('Customer creation failed:', error);
//       toast.error(error.message || 'Failed to create customer');
//     },
//   });

//   const updateCustomerMutation = useMutation({
//     mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {
//       console.log('Updating customer:', id, customerData);
//       const { data, error } = await supabase
//         .from('customers')
//         .update(customerData)
//         .eq('id', id)
//         .select()
//         .single();

//       if (error) {
//         console.error('Error updating customer:', error);
//         throw error;
//       }

//       console.log('Customer updated:', data);
//       return data as Customer;
//     },
//     onSuccess: (data) => {
//       queryClient.invalidateQueries({ queryKey: ['customers'] });
//       toast.success(`Customer "${data.name}" updated successfully!`);
//     },
//     onError: (error: any) => {
//       console.error('Customer update failed:', error);
//       toast.error(error.message || 'Failed to update customer');
//     },
//   });

//   const deleteCustomerMutation = useMutation({
//     mutationFn: async (id: string) => {
//       console.log('Deleting customer:', id);
//       const { error } = await supabase
//         .from('customers')
//         .delete()
//         .eq('id', id);

//       if (error) {
//         console.error('Error deleting customer:', error);
//         throw error;
//       }

//       console.log('Customer deleted:', id);
//       return id;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['customers'] });
//       toast.success('Customer deleted successfully!');
//     },
//     onError: (error: any) => {
//       console.error('Customer deletion failed:', error);
//       toast.error(error.message || 'Failed to delete customer');
//     },
//   });

//   return {
//     data: customers, // Keep both for backward compatibility
//     customers,
//     isLoading,
//     error,
//     refetch,
//     createCustomer: createCustomerMutation.mutateAsync,
//     updateCustomer: updateCustomerMutation.mutateAsync,
//     deleteCustomer: deleteCustomerMutation.mutateAsync,
//     isCreating: createCustomerMutation.isPending,
//     isUpdating: updateCustomerMutation.isPending,
//     isDeleting: deleteCustomerMutation.isPending,
//   };
// };

// // Export individual mutation hooks for better component usage
// export const useCreateCustomer = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (customerData: CreateCustomerData) => {
//       console.log('Creating customer:', customerData);
//       const { data, error } = await supabase
//         .from('customers')
//         .insert([customerData])
//         .select()
//         .single();

//       if (error) {
//         console.error('Error creating customer:', error);
//         throw error;
//       }

//       console.log('Customer created:', data);
//       return data as Customer;
//     },
//     onSuccess: (data) => {
//       queryClient.invalidateQueries({ queryKey: ['customers'] });
//       toast.success(`Customer "${data.name}" created successfully!`);
//     },
//     onError: (error: any) => {
//       console.error('Customer creation failed:', error);
//       toast.error(error.message || 'Failed to create customer');
//     },
//   });
// };

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Plus,
  Grid3X3,
  List,
  Eye,
  FileText,
  Loader2,
  Search
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import type { Customer } from "@/hooks/useCustomers";

type ViewType = 'list' | 'card';

interface CustomerManagementProps {
  onViewDetails?: (customer: Customer) => void;
  onNewQuote?: (customer: Customer) => void;
  onAddCustomer?: () => void;
}

export const CustomerManagement = ({ 
  onViewDetails,
  onNewQuote,
  onAddCustomer 
}: CustomerManagementProps) => {
  const [viewType, setViewType] = useState<ViewType>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use the real customers hook
  const { data: customers = [], isLoading, error, refetch } = useCustomers();

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm) ||
    (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to determine if customer is new (added in last 7 days)
  const isNewCustomer = (dateString?: string) => {
    if (!dateString) return false;
    const created = new Date(dateString);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <User className="h-12 w-12 mx-auto mb-2" />
          <p>Error loading customers</p>
        </div>
        <Button onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const CardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredCustomers.map((customer) => (
        <Card key={customer.id} className="relative">
          {isNewCustomer(customer.created_at) && (
            <Badge className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs">
              New
            </Badge>
          )}
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-800">{customer.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">{customer.mobile}</span>
              </div>
              
              {customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{customer.address}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-sm">Added {formatDate(customer.created_at)}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewDetails?.(customer)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onNewQuote?.(customer)}
              >
                <FileText className="h-4 w-4 mr-1" />
                New Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="space-y-4">
      {filteredCustomers.map((customer) => (
        <Card key={customer.id} className="relative">
          {isNewCustomer(customer.created_at) && (
            <Badge className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs">
              New
            </Badge>
          )}
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-800">{customer.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600">{customer.mobile}</span>
                </div>
                
                <div className="flex items-start gap-2">
                  {customer.address ? (
                    <>
                      <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">{customer.address}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">No address</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500 text-sm">Added {formatDate(customer.created_at)}</span>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewDetails?.(customer)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onNewQuote?.(customer)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  New Quote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and quotations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Type Selector */}
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Card View
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Add Customer Button */}
          <Button onClick={onAddCustomer} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by name, mobile, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddCustomer} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewType === 'list' ? <ListView /> : <CardView />}
        </>
      )}
    </div>
  );
};
