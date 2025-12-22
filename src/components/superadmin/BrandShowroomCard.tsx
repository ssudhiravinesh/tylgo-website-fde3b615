import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronDown,
    ChevronUp,
    Store,
    Users,
    FileText,
    UserCheck,
    IndianRupee,
    Grid3X3,
    Package
} from "lucide-react";
import { BrandWithShowrooms, ShowroomStats } from "@/hooks/useSuperAdminStats";

interface BrandShowroomCardProps {
    brand: BrandWithShowrooms;
}

const ShowroomMetricsRow = ({ showroom }: { showroom: ShowroomStats }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Store className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <p className="font-medium text-gray-900">{showroom.name}</p>
                    <p className="text-xs text-gray-500">{showroom.subdomain}.tylgo.com</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <Users className="w-3.5 h-3.5 text-green-500" />
                        {showroom.customerCount}
                    </div>
                    <p className="text-xs text-gray-400">Customers</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                        {showroom.workerCount}
                    </div>
                    <p className="text-xs text-gray-400">Workers</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <FileText className="w-3.5 h-3.5 text-orange-500" />
                        {showroom.quotationCount}
                    </div>
                    <p className="text-xs text-gray-400">Quotations</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <Grid3X3 className="w-3.5 h-3.5 text-cyan-500" />
                        {showroom.tileCount}
                    </div>
                    <p className="text-xs text-gray-400">Tiles</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <Package className="w-3.5 h-3.5 text-pink-500" />
                        {showroom.productCount}
                    </div>
                    <p className="text-xs text-gray-400">Products</p>
                </div>
                <div className="text-center min-w-[80px]">
                    <div className="flex items-center gap-0.5 text-sm font-medium text-green-700">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {showroom.totalRevenue.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-gray-400">Revenue</p>
                </div>
            </div>
        </div>
    );
};

export const BrandShowroomCard = ({ brand }: BrandShowroomCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">
                                {brand.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <CardTitle className="text-lg">{brand.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                    {brand.showroomCount} {brand.showroomCount === 1 ? 'Showroom' : 'Showrooms'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Customers</p>
                            <p className="text-lg font-semibold text-gray-800">{brand.totalCustomers}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Quotations</p>
                            <p className="text-lg font-semibold text-gray-800">{brand.totalQuotations}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-lg font-semibold text-green-600 flex items-center gap-0.5">
                                <IndianRupee className="w-4 h-4" />
                                {brand.totalRevenue.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="ml-2"
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                        {brand.showrooms.length > 0 ? (
                            brand.showrooms.map((showroom) => (
                                <ShowroomMetricsRow key={showroom.id} showroom={showroom} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No showrooms under this brand</p>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};
