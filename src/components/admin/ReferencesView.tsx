
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Phone, User, Search } from "lucide-react";
import { GridLoader } from "@/components/ui/GridLoader";
import { useCustomers } from "@/hooks/useCustomers";

interface ReferencesViewProps {
  onBack: () => void;
}

export const ReferencesView = ({ onBack }: ReferencesViewProps) => {
  const { data: customers = [], isLoading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter customers who have reference information
  const customersWithReferences = customers.filter(
    customer => customer.reference_name && customer.reference_mobile_no
  );

  // Apply search filter
  const filteredReferences = customersWithReferences.filter(customer =>
    customer.reference_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.reference_mobile_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <GridLoader className="py-12 min-h-[300px]" loadingText="Loading references..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer References</h1>
          <p className="text-muted-foreground">View all customer reference information</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search by reference name, mobile, or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* References List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            References ({filteredReferences.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReferences.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {customersWithReferences.length === 0 ? "No references found" : "No matching references"}
              </h3>
              <p className="text-muted-foreground">
                {customersWithReferences.length === 0
                  ? "Customers haven't provided reference information yet"
                  : "Try adjusting your search criteria"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReferences.map((customer) => (
                <div key={customer.id} className="p-4 border rounded-lg hover:bg-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Reference Information
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Name:</strong> {customer.reference_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <strong>Mobile:</strong> {customer.reference_mobile_no}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Customer Information</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Name:</strong> {customer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Mobile:</strong> {customer.mobile}
                      </p>
                    </div>

                    {customer.address && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Address</h4>
                        <p className="text-sm text-muted-foreground">{customer.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
