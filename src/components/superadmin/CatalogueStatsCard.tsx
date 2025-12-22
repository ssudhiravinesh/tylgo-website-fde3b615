import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Package, Clock, Folder } from "lucide-react";
import { CategoryCount } from "@/hooks/useSuperAdminStats";

interface CatalogueStatsCardProps {
    title: string;
    icon: "tiles" | "products";
    totalCount: number;
    categoryBreakdown: CategoryCount[];
    recentItems: { id: string; name?: string; code?: string; category: string; created_at: string }[];
}

const CATEGORY_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
    "bg-yellow-100 text-yellow-700",
    "bg-red-100 text-red-700",
];

export const CatalogueStatsCard = ({
    title,
    icon,
    totalCount,
    categoryBreakdown,
    recentItems
}: CatalogueStatsCardProps) => {
    const IconComponent = icon === "tiles" ? Grid3X3 : Package;
    const iconBgColor = icon === "tiles" ? "bg-cyan-100" : "bg-pink-100";
    const iconColor = icon === "tiles" ? "text-cyan-600" : "text-pink-600";
    const headerBg = icon === "tiles" ? "from-cyan-500 to-blue-600" : "from-pink-500 to-purple-600";

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Maximum categories to show
    const displayCategories = categoryBreakdown.slice(0, 6);
    const remainingCount = categoryBreakdown.slice(6).reduce((acc, cat) => acc + cat.count, 0);

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${headerBg} p-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            <p className="text-white/80 text-sm">Catalogue Overview</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-white">{totalCount.toLocaleString()}</p>
                        <p className="text-white/80 text-sm">Total Items</p>
                    </div>
                </div>
            </div>

            <CardContent className="pt-4">
                {/* Category Breakdown */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Folder className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium text-gray-700">By Category</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {displayCategories.map((cat, index) => (
                            <Badge
                                key={cat.category}
                                variant="secondary"
                                className={`${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} px-3 py-1`}
                            >
                                {cat.category}: {cat.count}
                            </Badge>
                        ))}
                        {remainingCount > 0 && (
                            <Badge variant="outline" className="px-3 py-1">
                                +{remainingCount} others
                            </Badge>
                        )}
                        {categoryBreakdown.length === 0 && (
                            <p className="text-sm text-gray-400">No categories yet</p>
                        )}
                    </div>
                </div>

                {/* Recently Added */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium text-gray-700">Recently Added (Last 7 Days)</h4>
                    </div>
                    {recentItems.length > 0 ? (
                        <div className="space-y-2">
                            {recentItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${iconBgColor} rounded flex items-center justify-center`}>
                                            <IconComponent className={`w-4 h-4 ${iconColor}`} />
                                        </div>
                                        <span className="font-medium text-gray-800 text-sm">
                                            {item.code || item.name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {item.category}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {formatDate(item.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-3">
                            No items added in the last 7 days
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
