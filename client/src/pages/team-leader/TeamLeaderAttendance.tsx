import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, LogIn, LogOut } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface AttendanceRecord {
    id: number;
    userId: number;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    workDuration: number | null;
    status: string;
}

export default function TeamLeaderAttendance() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();

    const { data: todayRecord, isLoading: loadingToday } =
        useQuery<AttendanceRecord>({
            queryKey: ["/api/attendance/today"],
            enabled: !!dbUserId,
            refetchInterval: 30000, // Refresh every 30 seconds
        });

    const { data: recentAttendance = [], isLoading: loadingHistory } = useQuery<
        AttendanceRecord[]
    >({
        queryKey: ["/api/attendance/history"],
        enabled: !!dbUserId,
    });

    const checkInMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                `${API_BASE_URL}/api/attendance/check-in`,
                "POST",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/today"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/history"],
            });
            toast({ title: "Success", description: "Checked in successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to check in",
                variant: "destructive",
            });
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                `${API_BASE_URL}/api/attendance/check-out`,
                "POST",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/today"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/history"],
            });
            toast({
                title: "Success",
                description: "Checked out successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to check out",
                variant: "destructive",
            });
        },
    });

    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return "Not recorded";
        return format(new Date(timeStr), "hh:mm a");
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0h 0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "present":
                return <Badge variant="default">Present</Badge>;
            case "late":
                return <Badge variant="secondary">Late</Badge>;
            case "absent":
                return <Badge variant="destructive">Absent</Badge>;
            case "on_leave":
                return <Badge variant="outline">On Leave</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loadingToday || loadingHistory) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-72" />
                </div>
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Attendance</h1>
                <p className="text-muted-foreground">
                    Track your attendance and working hours
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-md">
                                <LogIn className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Clock In
                                </p>
                                <p
                                    className="text-lg font-semibold"
                                    data-testid="text-clock-in">
                                    {formatTime(todayRecord?.checkIn || null)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                                <LogOut className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Clock Out
                                </p>
                                <p
                                    className="text-lg font-semibold"
                                    data-testid="text-clock-out">
                                    {formatTime(todayRecord?.checkOut || null)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Total Hours Today:
                            </span>
                            <span
                                className="font-semibold"
                                data-testid="text-total-hours">
                                {formatDuration(
                                    todayRecord?.workDuration || null
                                )}
                            </span>
                        </div>
                        {todayRecord?.status &&
                            getStatusBadge(todayRecord.status)}
                    </div>
                    <div className="flex gap-2">
                        {!todayRecord?.checkIn && (
                            <Button
                                onClick={() => checkInMutation.mutate()}
                                disabled={checkInMutation.isPending}
                                data-testid="button-clock-in">
                                <LogIn className="h-4 w-4 mr-2" />
                                {checkInMutation.isPending
                                    ? "Checking In..."
                                    : "Clock In"}
                            </Button>
                        )}
                        {todayRecord?.checkIn && !todayRecord?.checkOut && (
                            <Button
                                onClick={() => checkOutMutation.mutate()}
                                disabled={checkOutMutation.isPending}
                                data-testid="button-clock-out">
                                <LogOut className="h-4 w-4 mr-2" />
                                {checkOutMutation.isPending
                                    ? "Checking Out..."
                                    : "Clock Out"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentAttendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground">
                                No attendance history found
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAttendance.slice(0, 10).map((record) => (
                                <div
                                    key={record.id}
                                    className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b last:border-0"
                                    data-testid={`attendance-record-${record.id}`}>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {format(
                                                new Date(record.date),
                                                "MMM dd, yyyy"
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            {formatTime(record.checkIn)} -{" "}
                                            {formatTime(record.checkOut)}
                                        </span>
                                        <span className="font-medium">
                                            {formatDuration(
                                                record.workDuration
                                            )}
                                        </span>
                                        {getStatusBadge(record.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
