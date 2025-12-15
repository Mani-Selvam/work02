import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

interface TeamMemberStat {
    id: number;
    name: string;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    avgHours: string;
    trend: string;
}

interface AttendanceReportData {
    teamAttendanceRate: string;
    avgWorkingHours: string;
    lateArrivals: number;
    memberStats: TeamMemberStat[];
}

export default function TeamAttendanceReports() {
    const { dbUserId } = useAuth();
    const [period, setPeriod] = useState<string>("month");

    const getDateRange = (periodType: string) => {
        const now = new Date();
        let startDate: string, endDate: string;

        switch (periodType) {
            case "week":
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                startDate = weekAgo.toISOString().split("T")[0];
                endDate = now.toISOString().split("T")[0];
                break;
            case "quarter":
                const quarter = Math.floor(now.getMonth() / 3);
                const quarterStart = new Date(
                    now.getFullYear(),
                    quarter * 3,
                    1
                );
                startDate = quarterStart.toISOString().split("T")[0];
                endDate = now.toISOString().split("T")[0];
                break;
            case "year":
                const yearStart = new Date(now.getFullYear(), 0, 1);
                startDate = yearStart.toISOString().split("T")[0];
                endDate = now.toISOString().split("T")[0];
                break;
            default: // month
                const monthStart = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );
                startDate = monthStart.toISOString().split("T")[0];
                endDate = now.toISOString().split("T")[0];
                break;
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange(period);

    const { data: reportData, isLoading } = useQuery<AttendanceReportData>({
        queryKey: [
            `/api/team-assignments/${dbUserId}/attendance/reports`,
            { startDate, endDate },
        ],
        enabled: !!dbUserId,
    });

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case "up":
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case "down":
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            default:
                return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const handleExport = () => {
        if (!reportData) return;

        const csv = [
            [
                "Name",
                "Present Days",
                "Absent Days",
                "Late Days",
                "Avg Hours",
                "Trend",
            ].join(","),
            ...reportData.memberStats.map((m) =>
                [
                    m.name,
                    m.presentDays,
                    m.absentDays,
                    m.lateDays,
                    m.avgHours,
                    m.trend,
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `team-attendance-report-${startDate}-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Attendance Reports</h1>
                    <p className="text-muted-foreground">
                        View team attendance analytics and trends
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger
                            className="w-40"
                            data-testid="select-report-period">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="quarter">
                                This Quarter
                            </SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        data-testid="button-download-report">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Team Attendance Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-attendance-rate">
                            {reportData?.teamAttendanceRate || "0.0"}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Overall performance
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Avg Working Hours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-avg-hours">
                            {reportData?.avgWorkingHours || "0h"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Per team member
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Late Arrivals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-late-arrivals">
                            {reportData?.lateArrivals || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total instances
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Team Member Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    {!reportData || reportData.memberStats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground">
                                No attendance data available for this period
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-2 font-medium">
                                            Name
                                        </th>
                                        <th className="text-left py-3 px-2 font-medium">
                                            Present
                                        </th>
                                        <th className="text-left py-3 px-2 font-medium">
                                            Absent
                                        </th>
                                        <th className="text-left py-3 px-2 font-medium">
                                            Late
                                        </th>
                                        <th className="text-left py-3 px-2 font-medium">
                                            Avg Hours
                                        </th>
                                        <th className="text-left py-3 px-2 font-medium">
                                            Trend
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.memberStats.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="border-b last:border-0"
                                            data-testid={`report-row-${member.id}`}>
                                            <td className="py-3 px-2 font-medium">
                                                {member.name}
                                            </td>
                                            <td className="py-3 px-2 text-green-600">
                                                {member.presentDays}
                                            </td>
                                            <td className="py-3 px-2 text-red-600">
                                                {member.absentDays}
                                            </td>
                                            <td className="py-3 px-2 text-orange-600">
                                                {member.lateDays}
                                            </td>
                                            <td className="py-3 px-2">
                                                {member.avgHours}
                                            </td>
                                            <td className="py-3 px-2">
                                                {getTrendIcon(member.trend)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
