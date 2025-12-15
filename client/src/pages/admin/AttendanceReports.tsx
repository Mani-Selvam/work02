import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Download,
    Calendar,
    TrendingUp,
    Users,
    Clock,
    BarChart3,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

export default function AttendanceReports() {
    const [dateRange, setDateRange] = useState("7");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const getDateRange = () => {
        const now = new Date();
        let startDate = "";
        let endDate = format(now, "yyyy-MM-dd");

        switch (dateRange) {
            case "7":
                startDate = format(subDays(now, 7), "yyyy-MM-dd");
                break;
            case "30":
                startDate = format(subDays(now, 30), "yyyy-MM-dd");
                break;
            case "90":
                startDate = format(subDays(now, 90), "yyyy-MM-dd");
                break;
            case "month":
                startDate = format(startOfMonth(now), "yyyy-MM-dd");
                endDate = format(endOfMonth(now), "yyyy-MM-dd");
                break;
            case "custom":
                startDate = customStartDate;
                endDate = customEndDate;
                break;
            default:
                startDate = format(subDays(now, 7), "yyyy-MM-dd");
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();

    const { data: reportData, isLoading } = useQuery<{
        summary: {
            totalEmployees: number;
            totalPresent: number;
            totalAbsent: number;
            totalLate: number;
            totalLeave: number;
            avgAttendanceRate: number;
        };
        dailyTrends: Array<{
            date: string;
            present: number;
            absent: number;
            late: number;
            leave: number;
        }>;
        departmentStats?: Array<{
            department: string;
            present: number;
            absent: number;
            late: number;
        }>;
        employeeStats: Array<{
            userId: number;
            userName: string;
            present: number;
            absent: number;
            late: number;
            attendanceRate: number;
        }>;
    }>({
        queryKey: [
            "/api/admin/attendance/reports",
            { startDate, endDate, type: "summary" },
        ],
        enabled:
            !!startDate &&
            !!endDate &&
            (dateRange !== "custom" || (!!customStartDate && !!customEndDate)),
    });

    const handleExportCSV = () => {
        if (!reportData) return;

        const csvContent = [
            ["Attendance Report", `${startDate} to ${endDate}`],
            [],
            ["Summary Statistics"],
            ["Total Employees", reportData.summary.totalEmployees],
            ["Total Present", reportData.summary.totalPresent],
            ["Total Absent", reportData.summary.totalAbsent],
            ["Total Late", reportData.summary.totalLate],
            ["Total Leave", reportData.summary.totalLeave],
            [
                "Average Attendance Rate",
                `${reportData.summary.avgAttendanceRate.toFixed(2)}%`,
            ],
            [],
            ["Employee Statistics"],
            ["Name", "Present", "Absent", "Late", "Attendance Rate"],
            ...reportData.employeeStats.map((emp) => [
                emp.userName,
                emp.present,
                emp.absent,
                emp.late,
                `${emp.attendanceRate.toFixed(2)}%`,
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-report-${startDate}-to-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const COLORS = {
        present: "#22c55e",
        absent: "#ef4444",
        late: "#f59e0b",
        leave: "#3b82f6",
    };

    const pieData = reportData
        ? [
              {
                  name: "Present",
                  value: reportData.summary.totalPresent,
                  color: COLORS.present,
              },
              {
                  name: "Absent",
                  value: reportData.summary.totalAbsent,
                  color: COLORS.absent,
              },
              {
                  name: "Late",
                  value: reportData.summary.totalLate,
                  color: COLORS.late,
              },
              {
                  name: "Leave",
                  value: reportData.summary.totalLeave,
                  color: COLORS.leave,
              },
          ]
        : [];

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Attendance Reports & Analytics
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        View comprehensive attendance statistics and trends
                    </p>
                </div>

                <Button
                    onClick={handleExportCSV}
                    disabled={!reportData}
                    data-testid="button-export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Date Range
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 flex-wrap items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Label>Select Period</Label>
                            <Select
                                value={dateRange}
                                onValueChange={setDateRange}>
                                <SelectTrigger data-testid="select-date-range">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">
                                        Last 7 Days
                                    </SelectItem>
                                    <SelectItem value="30">
                                        Last 30 Days
                                    </SelectItem>
                                    <SelectItem value="90">
                                        Last 90 Days
                                    </SelectItem>
                                    <SelectItem value="month">
                                        This Month
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        Custom Range
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dateRange === "custom" && (
                            <>
                                <div className="flex-1 min-w-[150px]">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) =>
                                            setCustomStartDate(e.target.value)
                                        }
                                        data-testid="input-start-date"
                                    />
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) =>
                                            setCustomEndDate(e.target.value)
                                        }
                                        data-testid="input-end-date"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {startDate && endDate && (
                        <div className="mt-4 text-sm text-muted-foreground">
                            Showing data from{" "}
                            <span className="font-medium">
                                {format(new Date(startDate), "MMM dd, yyyy")}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                                {format(new Date(endDate), "MMM dd, yyyy")}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : reportData ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Total Employees
                                        </div>
                                        <div
                                            className="text-2xl font-semibold"
                                            data-testid="text-total-employees">
                                            {reportData.summary.totalEmployees}
                                        </div>
                                    </div>
                                    <Users className="w-8 h-8 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Present
                                        </div>
                                        <div
                                            className="text-2xl font-semibold text-green-600"
                                            data-testid="text-total-present">
                                            {reportData.summary.totalPresent}
                                        </div>
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded-full"
                                        style={{
                                            backgroundColor: COLORS.present,
                                        }}></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Absent
                                        </div>
                                        <div
                                            className="text-2xl font-semibold text-red-600"
                                            data-testid="text-total-absent">
                                            {reportData.summary.totalAbsent}
                                        </div>
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded-full"
                                        style={{
                                            backgroundColor: COLORS.absent,
                                        }}></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Late
                                        </div>
                                        <div
                                            className="text-2xl font-semibold text-yellow-600"
                                            data-testid="text-total-late">
                                            {reportData.summary.totalLate}
                                        </div>
                                    </div>
                                    <Clock className="w-8 h-8 text-yellow-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Attendance Rate
                                        </div>
                                        <div
                                            className="text-2xl font-semibold text-blue-600"
                                            data-testid="text-attendance-rate">
                                            {reportData.summary.avgAttendanceRate.toFixed(
                                                1
                                            )}
                                            %
                                        </div>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Daily Attendance Trends
                                </CardTitle>
                                <CardDescription>
                                    Attendance patterns over the selected period
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={reportData.dailyTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value) =>
                                                format(
                                                    new Date(value),
                                                    "MMM dd"
                                                )
                                            }
                                        />
                                        <YAxis />
                                        <Tooltip
                                            labelFormatter={(value) =>
                                                format(
                                                    new Date(value),
                                                    "MMM dd, yyyy"
                                                )
                                            }
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="present"
                                            stroke={COLORS.present}
                                            name="Present"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="late"
                                            stroke={COLORS.late}
                                            name="Late"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="absent"
                                            stroke={COLORS.absent}
                                            name="Absent"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="leave"
                                            stroke={COLORS.leave}
                                            name="Leave"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Attendance Distribution</CardTitle>
                                <CardDescription>
                                    Overall breakdown of attendance status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value, percent }) =>
                                                `${name}: ${value} (${(
                                                    percent * 100
                                                ).toFixed(0)}%)`
                                            }
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Employee Attendance Statistics
                            </CardTitle>
                            <CardDescription>
                                Individual employee performance over the
                                selected period
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3 text-sm font-semibold">
                                                Employee
                                            </th>
                                            <th className="text-left p-3 text-sm font-semibold">
                                                Present
                                            </th>
                                            <th className="text-left p-3 text-sm font-semibold">
                                                Absent
                                            </th>
                                            <th className="text-left p-3 text-sm font-semibold">
                                                Late
                                            </th>
                                            <th className="text-left p-3 text-sm font-semibold">
                                                Attendance Rate
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.employeeStats.map(
                                            (employee) => (
                                                <tr
                                                    key={employee.userId}
                                                    className="border-b hover-elevate"
                                                    data-testid={`employee-${employee.userId}`}>
                                                    <td className="p-3 text-sm font-medium">
                                                        {employee.userName}
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        <Badge variant="default">
                                                            {employee.present}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        <Badge variant="destructive">
                                                            {employee.absent}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        <Badge variant="secondary">
                                                            {employee.late}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                                                                <div
                                                                    className="bg-primary h-2 rounded-full"
                                                                    style={{
                                                                        width: `${employee.attendanceRate}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="font-medium">
                                                                {employee.attendanceRate.toFixed(
                                                                    1
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="p-12">
                        <div className="text-center text-muted-foreground">
                            Select a date range to view attendance reports
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
