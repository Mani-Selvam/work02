import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    LogIn,
    LogOut,
} from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    parseISO,
} from "date-fns";
import type { AttendanceRecord } from "@shared/schema";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

interface Holiday {
    id: number;
    companyId: number;
    name: string;
    date: string;
    description: string | null;
}

export default function AttendanceHistory() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const startDate = format(
        startOfMonth(new Date(selectedYear, selectedMonth)),
        "yyyy-MM-dd"
    );
    const endDate = format(
        endOfMonth(new Date(selectedYear, selectedMonth)),
        "yyyy-MM-dd"
    );

    const { data: user } = useQuery<{ id: number; companyId: number | null }>({
        queryKey: ["/api/me"],
    });

    const { data: attendanceRecords, isLoading } = useQuery<AttendanceRecord[]>(
        {
            queryKey: ["/api/attendance/history", { startDate, endDate }],
        }
    );

    const { data: holidays = [] } = useQuery<Holiday[]>({
        queryKey: [`/api/holidays/company/${user?.companyId}`],
        enabled: !!user?.companyId,
    });

    const { data: monthlySummary } = useQuery<{
        totalDays: number;
        present: number;
        absent: number;
        late: number;
        leave: number;
        halfDay: number;
    }>({
        queryKey: [
            "/api/attendance/monthly-summary",
            { month: selectedMonth + 1, year: selectedYear },
        ],
    });

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(new Date(selectedYear, selectedMonth)),
        end: endOfMonth(new Date(selectedYear, selectedMonth)),
    });

    const getAttendanceForDate = (date: Date) => {
        if (!attendanceRecords) return null;
        const dateStr = format(date, "yyyy-MM-dd");
        return attendanceRecords.find((record) => record.date === dateStr);
    };

    const getHolidayForDate = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return holidays.find((holiday) => holiday.date === dateStr);
    };

    const filteredRecords =
        attendanceRecords?.filter((record) => {
            if (statusFilter === "all") return true;
            return record.status === statusFilter;
        }) || [];

    const getStatusColor = (status: string, isHoliday: boolean = false) => {
        if (isHoliday) {
            return "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700";
        }
        const colors: Record<string, string> = {
            present:
                "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700",
            absent: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700",
            late: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
            leave: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700",
            "half-day":
                "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700",
        };
        return colors[status] || "bg-muted";
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            present: { variant: "default", label: "Present" },
            absent: { variant: "destructive", label: "Absent" },
            late: { variant: "secondary", label: "Late" },
            leave: { variant: "outline", label: "Leave" },
            "half-day": { variant: "outline", label: "Half Day" },
        };
        const config = variants[status] || {
            variant: "outline",
            label: status,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatTime = (time: string | Date | null) => {
        if (!time) return "-";
        const date = typeof time === "string" ? new Date(time) : time;
        return format(date, "hh:mm a");
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "-";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const years = Array.from(
        { length: 5 },
        (_, i) => currentDate.getFullYear() - 2 + i
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Attendance History
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        View your complete attendance records
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handlePreviousMonth}
                        data-testid="button-previous-month">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) =>
                            setSelectedMonth(parseInt(value))
                        }>
                        <SelectTrigger
                            className="w-[140px]"
                            data-testid="select-month">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((month, index) => (
                                <SelectItem
                                    key={index}
                                    value={index.toString()}>
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) =>
                            setSelectedYear(parseInt(value))
                        }>
                        <SelectTrigger
                            className="w-[100px]"
                            data-testid="select-year">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleNextMonth}
                        data-testid="button-next-month">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {monthlySummary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Total Days
                            </div>
                            <div
                                className="text-2xl font-semibold"
                                data-testid="text-total-days">
                                {monthlySummary.totalDays}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Present
                            </div>
                            <div
                                className="text-2xl font-semibold text-green-600"
                                data-testid="text-present">
                                {monthlySummary.present}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Absent
                            </div>
                            <div
                                className="text-2xl font-semibold text-red-600"
                                data-testid="text-absent">
                                {monthlySummary.absent}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Late
                            </div>
                            <div
                                className="text-2xl font-semibold text-yellow-600"
                                data-testid="text-late">
                                {monthlySummary.late}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Leave
                            </div>
                            <div
                                className="text-2xl font-semibold text-blue-600"
                                data-testid="text-leave">
                                {monthlySummary.leave}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Half Day
                            </div>
                            <div
                                className="text-2xl font-semibold text-purple-600"
                                data-testid="text-halfday">
                                {monthlySummary.halfDay}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
                <div className="text-sm font-medium">Filter by Status:</div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant={statusFilter === "all" ? "default" : "outline"}
                        onClick={() => setStatusFilter("all")}
                        data-testid="filter-all">
                        All
                    </Button>
                    <Button
                        size="sm"
                        variant={
                            statusFilter === "present" ? "default" : "outline"
                        }
                        onClick={() => setStatusFilter("present")}
                        data-testid="filter-present">
                        Present
                    </Button>
                    <Button
                        size="sm"
                        variant={
                            statusFilter === "late" ? "default" : "outline"
                        }
                        onClick={() => setStatusFilter("late")}
                        data-testid="filter-late">
                        Late
                    </Button>
                    <Button
                        size="sm"
                        variant={
                            statusFilter === "absent" ? "default" : "outline"
                        }
                        onClick={() => setStatusFilter("absent")}
                        data-testid="filter-absent">
                        Absent
                    </Button>
                    <Button
                        size="sm"
                        variant={
                            statusFilter === "leave" ? "default" : "outline"
                        }
                        onClick={() => setStatusFilter("leave")}
                        data-testid="filter-leave">
                        Leave
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        {MONTHS[selectedMonth]} {selectedYear} Calendar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700"></div>
                            <span className="text-muted-foreground">
                                Present
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"></div>
                            <span className="text-muted-foreground">Late</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700"></div>
                            <span className="text-muted-foreground">
                                Absent
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700"></div>
                            <span className="text-muted-foreground">Leave</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700"></div>
                            <span className="text-muted-foreground">
                                Holiday
                            </span>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {[
                                "Sun",
                                "Mon",
                                "Tue",
                                "Wed",
                                "Thu",
                                "Fri",
                                "Sat",
                            ].map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-sm font-semibold p-2 text-muted-foreground">
                                    {day}
                                </div>
                            ))}

                            {Array.from({
                                length: daysInMonth[0].getDay(),
                            }).map((_, index) => (
                                <div key={`empty-${index}`} className="p-2" />
                            ))}

                            {daysInMonth.map((day) => {
                                const attendance = getAttendanceForDate(day);
                                const holiday = getHolidayForDate(day);
                                const isToday = isSameDay(day, new Date());
                                const shouldShow =
                                    statusFilter === "all" ||
                                    attendance?.status === statusFilter;

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`
                      p-3 rounded-md border-2 min-h-[100px] relative
                      ${isToday ? "border-primary" : "border-border"}
                      ${
                          holiday
                              ? getStatusColor("", true)
                              : attendance && shouldShow
                              ? getStatusColor(attendance.status)
                              : "bg-background"
                      }
                      ${
                          !shouldShow && attendance && !holiday
                              ? "opacity-30"
                              : ""
                      }
                    `}
                                        data-testid={`calendar-day-${format(
                                            day,
                                            "yyyy-MM-dd"
                                        )}`}>
                                        <div className="text-sm font-semibold mb-2">
                                            {format(day, "d")}
                                        </div>
                                        {holiday && (
                                            <div className="space-y-1 text-xs">
                                                <div className="font-semibold text-orange-700 dark:text-orange-300">
                                                    {holiday.name}
                                                </div>
                                                {holiday.description && (
                                                    <div className="text-orange-600 dark:text-orange-400">
                                                        {holiday.description}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {attendance &&
                                            shouldShow &&
                                            !holiday && (
                                                <div className="space-y-1 text-xs">
                                                    <div className="font-medium">
                                                        {getStatusBadge(
                                                            attendance.status
                                                        )}
                                                    </div>
                                                    {attendance.checkIn && (
                                                        <div className="flex items-center gap-1">
                                                            <LogIn className="w-3 h-3" />
                                                            {formatTime(
                                                                attendance.checkIn
                                                            )}
                                                        </div>
                                                    )}
                                                    {attendance.checkOut && (
                                                        <div className="flex items-center gap-1">
                                                            <LogOut className="w-3 h-3" />
                                                            {formatTime(
                                                                attendance.checkOut
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Records</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No attendance records found for the selected filters
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Date
                                        </th>
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Status
                                        </th>
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Check In
                                        </th>
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Check Out
                                        </th>
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Duration
                                        </th>
                                        <th className="text-left p-3 text-sm font-semibold">
                                            Remarks
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="border-b hover-elevate"
                                            data-testid={`record-${record.id}`}>
                                            <td className="p-3 text-sm">
                                                {format(
                                                    parseISO(record.date),
                                                    "MMM dd, yyyy"
                                                )}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {getStatusBadge(record.status)}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {formatTime(record.checkIn)}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {formatTime(record.checkOut)}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {formatDuration(
                                                    record.workDuration
                                                )}
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground">
                                                {record.remarks || "-"}
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
