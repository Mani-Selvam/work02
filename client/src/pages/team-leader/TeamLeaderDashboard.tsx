import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    CheckSquare,
    Calendar,
    Clock,
    Circle,
    UserCheck,
    UserX,
    MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

interface TeamMember {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
    uniqueUserId: string;
    isActive: boolean;
}

interface Task {
    id: number;
    title: string;
    status: string;
    assignedTo: number;
}

interface Leave {
    id: number;
    userId: number;
    status: string;
    startDate: string;
    endDate: string;
}

interface AttendanceRecord {
    id: number;
    userId: number;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
}

interface GroupMessage {
    id: number;
    companyId: number;
    senderId: number;
    title: string | null;
    message: string;
    createdAt: string;
}

export default function TeamLeaderDashboard() {
    const { user, dbUserId, companyId } = useAuth();

    const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<
        TeamMember[]
    >({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
    });

    const { data: allTasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
        queryKey: ["/api/tasks"],
        enabled: !!companyId,
    });

    const { data: allLeaves = [], isLoading: loadingLeaves } = useQuery<
        Leave[]
    >({
        queryKey: [`/api/leaves/company/${companyId}`],
        enabled: !!companyId,
    });

    const { data: todayAttendance = [] } = useQuery<AttendanceRecord[]>({
        queryKey: [`/api/team-assignments/${dbUserId}/attendance/today`],
        enabled: !!dbUserId,
    });

    const { data: groupMessages = [] } = useQuery<GroupMessage[]>({
        queryKey: [`/api/group-messages`],
        enabled: !!companyId,
    });

    const teamMemberIds = teamMembers.map((m) => m.id);

    const teamPendingTasks = allTasks.filter(
        (task) =>
            teamMemberIds.includes(task.assignedTo) &&
            (task.status === "pending" || task.status === "in_progress")
    );

    const teamPendingLeaves = allLeaves.filter(
        (leave) =>
            teamMemberIds.includes(leave.userId) && leave.status === "pending"
    );

    const today = new Date().toISOString().split("T")[0];
    const teamTodayAttendance = todayAttendance.filter(
        (record) =>
            teamMemberIds.includes(record.userId) && record.date === today
    );

    const presentCount = teamTodayAttendance.filter(
        (record) => record.checkIn !== null || record.status === "present"
    ).length;

    const attendanceRate =
        teamMembers.length > 0
            ? Math.round((presentCount / teamMembers.length) * 100)
            : 0;

    const getTodayStatus = (memberId: number) => {
        const record = teamTodayAttendance.find((r) => r.userId === memberId);
        if (!record)
            return {
                status: "absent",
                label: "Not Checked In",
                color: "text-muted-foreground",
            };
        if (record.status === "leave" || record.status === "approved_leave")
            return {
                status: "leave",
                label: "On Leave",
                color: "text-blue-600 dark:text-blue-400",
            };
        if (record.checkIn && !record.checkOut)
            return {
                status: "present",
                label: "Checked In",
                color: "text-green-600 dark:text-green-400",
            };
        if (record.checkIn && record.checkOut)
            return {
                status: "completed",
                label: "Checked Out",
                color: "text-muted-foreground",
            };
        return {
            status: "absent",
            label: "Absent",
            color: "text-red-600 dark:text-red-400",
        };
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (loadingMembers) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-12 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-3xl font-bold"
                    data-testid="text-dashboard-title">
                    Welcome, {user?.displayName}
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage your team and monitor their activities
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Team Members
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-team-count">
                            {teamMembers.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active members under supervision
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending Tasks
                        </CardTitle>
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-pending-tasks">
                            {loadingTasks ? "..." : teamPendingTasks.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tasks awaiting completion
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Leave Requests
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-leave-requests">
                            {loadingLeaves ? "..." : teamPendingLeaves.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pending your approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Attendance Today
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-attendance-rate">
                            {attendanceRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {presentCount} of {teamMembers.length} present
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Team Members - Live Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {teamMembers.length === 0 ? (
                            <div className="text-center py-8">
                                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    No team members assigned yet
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Contact your admin to assign team members
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {teamMembers.map((member) => {
                                    const statusInfo = getTodayStatus(
                                        member.id
                                    );
                                    const memberTasks = teamPendingTasks.filter(
                                        (t) => t.assignedTo === member.id
                                    );

                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-3 p-3 rounded-md hover-elevate"
                                            data-testid={`member-card-${member.id}`}>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage
                                                    src={member.photoURL}
                                                    alt={member.displayName}
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        member.displayName
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate">
                                                        {member.displayName}
                                                    </p>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                        data-testid={`member-status-${member.id}`}>
                                                        {member.uniqueUserId}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Circle
                                                            className={`h-2 w-2 fill-current ${statusInfo.color}`}
                                                        />
                                                        <span
                                                            className={`text-xs ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    {memberTasks.length > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {memberTasks.length}{" "}
                                                            pending task
                                                            {memberTasks.length !==
                                                            1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {!member.isActive && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs">
                                                    Inactive
                                                </Badge>
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
                        <CardTitle className="flex items-center gap-2">
                            <CheckSquare className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teamPendingLeaves.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">
                                        Pending Leave Requests
                                    </h4>
                                    <div className="space-y-2">
                                        {teamPendingLeaves
                                            .slice(0, 3)
                                            .map((leave) => {
                                                const member = teamMembers.find(
                                                    (m) => m.id === leave.userId
                                                );
                                                return (
                                                    <div
                                                        key={leave.id}
                                                        className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">
                                                                {member?.displayName ||
                                                                    "Unknown"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(
                                                                    leave.startDate
                                                                ).toLocaleDateString()}{" "}
                                                                -{" "}
                                                                {new Date(
                                                                    leave.endDate
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline">
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {teamPendingTasks.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">
                                        Active Tasks
                                    </h4>
                                    <div className="space-y-2">
                                        {teamPendingTasks
                                            .slice(0, 3)
                                            .map((task) => {
                                                const member = teamMembers.find(
                                                    (m) =>
                                                        m.id === task.assignedTo
                                                );
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {task.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Assigned to:{" "}
                                                                {member?.displayName ||
                                                                    "Unknown"}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                task.status ===
                                                                "in_progress"
                                                                    ? "default"
                                                                    : "secondary"
                                                            }>
                                                            {task.status.replace(
                                                                "_",
                                                                " "
                                                            )}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {teamPendingLeaves.length === 0 &&
                                teamPendingTasks.length === 0 && (
                                    <div className="text-center py-8">
                                        <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No pending activities
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            All tasks and requests are up to
                                            date
                                        </p>
                                    </div>
                                )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
