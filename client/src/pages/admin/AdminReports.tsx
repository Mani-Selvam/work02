import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Report, User } from "@shared/schema";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

export default function AdminReports() {
    const [searchTerm, setSearchTerm] = useState("");
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [dateFilter, setDateFilter] = useState({
        startDate: "",
        endDate: "",
    });

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const { data: reports = [], isLoading: reportsLoading } = useQuery<
        Report[]
    >({
        queryKey: ["/api/reports", dateFilter.startDate, dateFilter.endDate],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;

            let url = `${API_BASE_URL}/api/reports`;
            const params = new URLSearchParams();
            if (dateFilter.startDate)
                params.append("startDate", dateFilter.startDate);
            if (dateFilter.endDate)
                params.append("endDate", dateFilter.endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(url, { headers, credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch reports");
            return res.json();
        },
    });

    const getUserNameById = (userId: number) => {
        const user = users.find((u) => u.id === userId);
        return user?.displayName || "Unknown User";
    };

    const filteredReports = reports.filter((report) => {
        const userName = getUserNameById(report.userId);
        return userName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleViewReport = (report: Report) => {
        setSelectedReport(report);
        setReportDialogOpen(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Reports</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    View and filter user reports
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                        Filter Reports
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label
                                htmlFor="search"
                                className="text-xs sm:text-sm">
                                Search by name
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search reports..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-10 text-sm"
                                    data-testid="input-search-reports"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="start-date"
                                className="text-xs sm:text-sm">
                                Start Date
                            </Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={dateFilter.startDate}
                                onChange={(e) =>
                                    setDateFilter({
                                        ...dateFilter,
                                        startDate: e.target.value,
                                    })
                                }
                                className="text-sm"
                                data-testid="input-start-date"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="end-date"
                                className="text-xs sm:text-sm">
                                End Date
                            </Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={dateFilter.endDate}
                                onChange={(e) =>
                                    setDateFilter({
                                        ...dateFilter,
                                        endDate: e.target.value,
                                    })
                                }
                                className="text-sm"
                                data-testid="input-end-date"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                        All Reports ({filteredReports.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {reportsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredReports.length > 0 ? (
                        <div className="space-y-3">
                            {filteredReports.map((report) => (
                                <Card
                                    key={report.id}
                                    className="hover-elevate cursor-pointer"
                                    onClick={() => handleViewReport(report)}
                                    data-testid={`card-report-${report.id}`}>
                                    <CardContent className="p-3 sm:p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm sm:text-base truncate">
                                                    {getUserNameById(
                                                        report.userId
                                                    )}
                                                </h4>
                                                <p className="text-xs sm:text-sm text-muted-foreground">
                                                    {format(
                                                        new Date(
                                                            report.createdAt
                                                        ),
                                                        "MMM dd, yyyy · HH:mm"
                                                    )}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    report.reportType ===
                                                    "morning"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="text-xs">
                                                {report.reportType}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No reports found
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">
                            Report Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        User
                                    </Label>
                                    <p className="text-sm sm:text-base font-semibold">
                                        {getUserNameById(selectedReport.userId)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        Type
                                    </Label>
                                    <Badge
                                        variant={
                                            selectedReport.reportType ===
                                            "morning"
                                                ? "default"
                                                : "secondary"
                                        }
                                        className="text-xs">
                                        {selectedReport.reportType}
                                    </Badge>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs sm:text-sm">
                                        Submitted
                                    </Label>
                                    <p className="text-sm sm:text-base">
                                        {format(
                                            new Date(selectedReport.createdAt),
                                            "PPpp"
                                        )}
                                    </p>
                                </div>
                            </div>

                            {selectedReport.plannedTasks && (
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        Planned Tasks
                                    </Label>
                                    <p className="text-sm sm:text-base mt-1 whitespace-pre-wrap">
                                        {selectedReport.plannedTasks}
                                    </p>
                                </div>
                            )}

                            {selectedReport.completedTasks && (
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        Completed Tasks
                                    </Label>
                                    <p className="text-sm sm:text-base mt-1 whitespace-pre-wrap">
                                        {selectedReport.completedTasks}
                                    </p>
                                </div>
                            )}

                            {selectedReport.pendingTasks && (
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        Pending Tasks
                                    </Label>
                                    <p className="text-sm sm:text-base mt-1 whitespace-pre-wrap">
                                        {selectedReport.pendingTasks}
                                    </p>
                                </div>
                            )}

                            {selectedReport.notes && (
                                <div>
                                    <Label className="text-xs sm:text-sm">
                                        Notes
                                    </Label>
                                    <p className="text-sm sm:text-base mt-1 whitespace-pre-wrap">
                                        {selectedReport.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
