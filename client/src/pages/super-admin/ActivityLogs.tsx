import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Activity, Building2, User, Settings } from "lucide-react";
import type { AdminActivityLog } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ActivityLogs() {
    const { data: logs = [], isLoading } = useQuery<AdminActivityLog[]>({
        queryKey: ["/api/super-admin/activity-logs"],
    });

    const getActionIcon = (actionType: string) => {
        if (actionType.includes("company"))
            return <Building2 className="h-4 w-4" />;
        if (actionType.includes("user")) return <User className="h-4 w-4" />;
        return <Settings className="h-4 w-4" />;
    };

    const getActionColor = (actionType: string) => {
        if (actionType.includes("delete")) return "destructive" as const;
        if (actionType.includes("suspend")) return "secondary" as const;
        if (actionType.includes("reactivate")) return "default" as const;
        return "outline" as const;
    };

    const formatActionType = (actionType: string) => {
        return actionType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div
            className="container mx-auto p-6 space-y-6"
            data-testid="activity-logs-page">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold" data-testid="page-title">
                        Activity Logs
                    </h1>
                    <p className="text-muted-foreground">
                        Track all Super Admin actions and changes
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>
                        Complete audit trail of administrative actions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
                                    data-testid={`log-item-${log.id}`}>
                                    <div className="mt-1">
                                        {getActionIcon(log.actionType)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={getActionColor(
                                                    log.actionType
                                                )}
                                                data-testid={`badge-action-${log.id}`}>
                                                {formatActionType(
                                                    log.actionType
                                                )}
                                            </Badge>
                                            <span
                                                className="text-xs text-muted-foreground"
                                                data-testid={`text-date-${log.id}`}>
                                                {format(
                                                    new Date(log.createdAt),
                                                    "MMM dd, yyyy 'at' HH:mm:ss"
                                                )}
                                            </span>
                                        </div>
                                        <p
                                            className="text-sm"
                                            data-testid={`text-details-${log.id}`}>
                                            {log.details ||
                                                "No details provided"}
                                        </p>
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                            {log.targetCompanyId && (
                                                <span>
                                                    Company ID:{" "}
                                                    {log.targetCompanyId}
                                                </span>
                                            )}
                                            {log.targetUserId && (
                                                <span>
                                                    User ID: {log.targetUserId}
                                                </span>
                                            )}
                                            <span>
                                                Performed by User ID:{" "}
                                                {log.performedBy}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {logs.length === 0 && (
                                <div className="text-center py-12">
                                    <p
                                        className="text-muted-foreground"
                                        data-testid="text-no-logs">
                                        No activity logs found
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
