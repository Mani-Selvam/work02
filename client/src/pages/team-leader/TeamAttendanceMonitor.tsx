import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
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

interface AttendanceRecord {
    userId: number;
    userName: string | null;
    userPhotoURL?: string | null;
    checkIn?: Date | null;
    checkOut?: Date | null;
    clockIn?: string | null;
    clockOut?: string | null;
    workDuration?: number | null;
    totalHours?: number;
    status: string;
}

export default function TeamAttendanceMonitor() {
    const { dbUserId } = useAuth();

    const { data: attendanceRecords = [], isLoading } = useQuery<
        AttendanceRecord[]
    >({
        queryKey: [`/api/team-assignments/${dbUserId}/attendance/today`],
        enabled: !!dbUserId,
        refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    });

    const stats = {
        present: attendanceRecords.filter((r) => r.status === "present").length,
        absent: attendanceRecords.filter((r) => r.status === "absent").length,
        late: attendanceRecords.filter((r) => r.status === "late").length,
        onLeave: attendanceRecords.filter((r) => r.status === "on_leave")
            .length,
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return null;
        return new Date(timeStr).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatHours = (hours?: number) => {
        if (!hours) return "0h";
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const getInitials = (name?: string) => {
        if (!name) return "??";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "present":
                return "default";
            case "late":
                return "secondary";
            case "absent":
                return "destructive";
            case "on_leave":
                return "secondary";
            default:
                return "secondary";
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-12" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        Team Attendance - Today
                    </h1>
                    <p className="text-muted-foreground">
                        Monitor your team's attendance in real-time
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Present
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-present">
                            {stats.present}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Absent
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-absent">
                            {stats.absent}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Late
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-late">
                            {stats.late}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            On Leave
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-leave">
                            {stats.onLeave}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                    {attendanceRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground">
                                No attendance records for today
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {attendanceRecords.map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b last:border-0"
                                    data-testid={`member-attendance-${member.userId}`}>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage
                                                src={
                                                    member.userPhotoURL ||
                                                    undefined
                                                }
                                            />
                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                {getInitials(
                                                    member.userName || undefined
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">
                                                {member.userName || "Unknown"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {member.clockIn
                                                    ? `In: ${formatTime(
                                                          member.clockIn
                                                      )}`
                                                    : "Not clocked in"}
                                                {member.clockOut &&
                                                    ` | Out: ${formatTime(
                                                        member.clockOut
                                                    )}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">
                                            {formatHours(member.totalHours)}
                                        </span>
                                        <Badge
                                            variant={getStatusBadgeVariant(
                                                member.status
                                            )}>
                                            {member.status.replace("_", " ")}
                                        </Badge>
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
