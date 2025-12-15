import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Report } from "@shared/schema";
import { API_BASE_URL } from "@/lib/queryClient";

export default function ReportView() {
    const { dbUserId } = useAuth();

    const { data: reports = [], isLoading } = useQuery<Report[]>({
        queryKey: ["/api/reports", dbUserId],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(
                `${API_BASE_URL}/api/reports?userId=${dbUserId}`,
                { headers, credentials: "include" }
            );
            if (!res.ok) throw new Error("Failed to fetch reports");
            return res.json();
        },
        enabled: !!dbUserId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">View Reports</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    All submitted reports
                </p>
            </div>

            {reports.length > 0 ? (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card
                            key={report.id}
                            data-testid={`card-report-${report.id}`}>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <CardTitle className="text-lg">
                                        {report.reportType === "morning"
                                            ? "Morning"
                                            : "Evening"}{" "}
                                        Report
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-xs w-fit">
                                        {format(
                                            new Date(report.createdAt),
                                            "MMM dd, yyyy HH:mm"
                                        )}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {report.plannedTasks && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                            Planned Tasks:
                                        </h4>
                                        <p
                                            className="text-sm whitespace-pre-wrap"
                                            data-testid={`text-planned-${report.id}`}>
                                            {report.plannedTasks}
                                        </p>
                                    </div>
                                )}
                                {report.completedTasks && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                            Completed Tasks:
                                        </h4>
                                        <p
                                            className="text-sm whitespace-pre-wrap"
                                            data-testid={`text-completed-${report.id}`}>
                                            {report.completedTasks}
                                        </p>
                                    </div>
                                )}
                                {report.pendingTasks && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                            Pending Tasks:
                                        </h4>
                                        <p
                                            className="text-sm whitespace-pre-wrap"
                                            data-testid={`text-pending-${report.id}`}>
                                            {report.pendingTasks}
                                        </p>
                                    </div>
                                )}
                                {report.notes && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                            Notes:
                                        </h4>
                                        <p
                                            className="text-sm whitespace-pre-wrap"
                                            data-testid={`text-notes-${report.id}`}>
                                            {report.notes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    No reports submitted yet
                </div>
            )}
        </div>
    );
}
