
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { TileManagement } from "@/components/tiles/TileManagement";
import { TileManagement as AdminTileManagement } from "@/components/admin/TileManagement";
import { QuotationList } from "@/components/quotations/QuotationList";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { CustomerRoomManagement } from "@/components/rooms/CustomerRoomManagement";
import { SuperAdminDashboard } from "@/components/superadmin/SuperAdminDashboard";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { HierarchyWrapper } from "@/components/superadmin/HierarchyWrapper";
import { ActiveView } from "./Dashboard";

interface DashboardContentProps {
    activeView: ActiveView;
    userRole: "admin" | "worker" | "super_admin";
    setActiveView: (view: ActiveView) => void;
    handlers: {
        handleNewQuote: (customerId: string) => void;
        handleNewQuoteFromForm: (customerId: string) => void;
        handleBackFromRooms: () => void;
        selectedCustomerForQuote: string | null;
    };
}

export const DashboardContent = ({
    activeView,
    userRole,
    setActiveView,
    handlers
}: DashboardContentProps) => {
    const {
        handleNewQuote,
        handleNewQuoteFromForm,
        handleBackFromRooms,
        selectedCustomerForQuote
    } = handlers;

    switch (activeView) {
        case "customers":
            if (userRole === "super_admin") {
                return (
                    <HierarchyWrapper
                        title="Customers"
                        description="Select a brand and showroom to view customers."
                        requireShowroom={true}
                    >
                        {({ showroomId }) => (
                            <CustomerList
                                onAddCustomer={() => setActiveView("add-customer")}
                                onNewQuote={handleNewQuote}
                                userRole={userRole}
                                showroomId={showroomId}
                            />
                        )}
                    </HierarchyWrapper>
                );
            }
            return (
                <CustomerList
                    onAddCustomer={() => setActiveView("add-customer")}
                    onNewQuote={handleNewQuote}
                    userRole={userRole}
                />
            );
        case "add-customer":
            return (
                <CustomerForm
                    onBack={() => setActiveView("customers")}
                    onNewQuote={handleNewQuoteFromForm}
                />
            );
        case "tiles":
            return <TileManagement userRole={userRole} />;
        case "manage-tiles":
            if (userRole === "super_admin") {
                return (
                    <HierarchyWrapper
                        title="Manage Tiles"
                        description="Select a brand to manage its tile catalog."
                        requireShowroom={false}
                    >
                        {({ brandId }) => <AdminTileManagement onBack={() => { }} brandId={brandId} />}
                    </HierarchyWrapper>
                );
            }
            return <AdminTileManagement onBack={() => { }} />;

        case "quotations":
            if (userRole === "super_admin") {
                return (
                    <HierarchyWrapper
                        title="Quotations"
                        description="Select a brand and showroom to view quotations."
                        requireShowroom={true}
                    >
                        {({ showroomId }) => <QuotationList userRole={userRole} showroomId={showroomId} />}
                    </HierarchyWrapper>
                );
            }
            return <QuotationList userRole={userRole} />;
        case "admin":
            if (userRole === "super_admin") {
                return <SuperAdminDashboard />;
            }
            return userRole === "admin" ? <AdminPanel /> : <div>Access denied</div>;
        case "products":
            if (userRole === "super_admin") {
                return (
                    <HierarchyWrapper
                        title="Product Catalog"
                        description="Select a brand to manage its products."
                        requireShowroom={false}
                    >
                        {({ brandId }) => <ProductCatalog userRole={userRole} brandId={brandId} />}
                    </HierarchyWrapper>
                );
            }
            return <ProductCatalog userRole={userRole} />;
        case "rooms":
            return (
                <CustomerRoomManagement
                    preSelectedCustomerId={selectedCustomerForQuote}
                    onBack={handleBackFromRooms}
                    onQuotationCreated={() => setActiveView("quotations")}
                />
            );
        default:
            return (
                <CustomerList
                    onAddCustomer={() => setActiveView("add-customer")}
                    onNewQuote={handleNewQuote}
                    userRole={userRole}
                />
            );
    }
};
