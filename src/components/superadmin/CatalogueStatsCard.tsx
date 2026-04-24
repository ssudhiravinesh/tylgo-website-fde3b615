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
    "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
    "bg-muted text-foreground border-border hover:bg-muted/80",
];

export const CatalogueStatsCard = ({
    title,
    icon,
    totalCount,
    categoryBreakdown,
    recentItems
}: CatalogueStatsCardProps) => {
    const IconComponent = icon === "tiles" ? Grid3X3 : Package;
    const iconBgColor = "bg-primary/10";
    const iconColor = "text-primary";
    const headerBg = "bg-card border-b border-border";

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
            <div className={`${headerBg} p-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                            <p className="text-muted-foreground text-sm">Catalogue Overview</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-foreground">{totalCount.toLocaleString()}</p>
                        <p className="text-muted-foreground text-sm">Total Items</p>
                    </div>
                </div>
            </div>

            <CardContent className="pt-4">
                {/* Category Breakdown */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Folder className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-medium text-foreground/80">By Category</h4>
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
                            <p className="text-sm text-muted-foreground/70">No categories yet</p>
                        )}
                    </div>
                </div>

                {/* Recently Added */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-medium text-foreground/80">Recently Added (Last 7 Days)</h4>
                    </div>
                    {recentItems.length > 0 ? (
                        <div className="space-y-2">
                            {recentItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${iconBgColor} rounded flex items-center justify-center`}>
                                            <IconComponent className={`w-4 h-4 ${iconColor}`} />
                                        </div>
                                        <span className="font-medium text-foreground text-sm">
                                            {item.code || item.name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {item.category}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground/70">
                                        {formatDate(item.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground/70 text-center py-3">
                            No items added in the last 7 days
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
