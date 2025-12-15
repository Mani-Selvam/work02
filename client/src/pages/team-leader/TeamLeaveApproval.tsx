import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Calendar, User } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface Leave {
    id: number;
    userId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    companyId: number;
    displayName?: string;
}

interface TeamMember {
    id: number;
    displayName: string;
}

export default function TeamLeaveApproval() {
    const { dbUserId, companyId } = useAuth();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<string>("pending");

    const handleWebSocketMessage = useCallback(
        (data: any) => {
            if (
                data.type === "LEAVE_STATUS_UPDATE" &&
                data.data.companyId === companyId
            ) {
                queryClient.invalidateQueries({
                    queryKey: [`/api/leaves/company/${companyId}`],
                });
                const actionBy =
                    data.data.changedBy ||
                    data.data.approvedBy ||
                    data.data.rejectedBy;
                toast({
                    title: "Leave Status Updated",
                    description: `${data.data.userName}'s leave status changed to ${data.data.status} by ${actionBy}`,
                });
            }
        },
        [toast, companyId]
    );

    useWebSocket(handleWebSocketMessage);

    const { data: teamMembers = [] } = useQuery<TeamMember[]>({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
    });

    const { data: allLeaves = [], isLoading } = useQuery<Leave[]>({
        queryKey: [`/api/leaves/company/${companyId}`],
        enabled: !!companyId,
    });

    const teamMemberIds = teamMembers.map((m) => m.id);
    const teamLeaves = allLeaves.filter((leave) =>
        teamMemberIds.includes(leave.userId)
    );
    const filteredLeaves =
        statusFilter === "all"
            ? teamLeaves
            : teamLeaves.filter((leave) => leave.status === statusFilter);

    const approveLeave = useMutation({
        mutationFn: async (leaveId: number) => {
            return apiRequest(
                `${API_BASE_URL}/api/leaves/${leaveId}/approve`,
                "PATCH"
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/leaves/company/${companyId}`],
            });
            toast({ title: "Success", description: "Leave request approved" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to approve leave",
                variant: "destructive",
            });
        },
    });

    const rejectLeave = useMutation({
        mutationFn: async (leaveId: number) => {
            return apiRequest(
                `${API_BASE_URL}/api/leaves/${leaveId}/reject`,
                "PATCH"
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/leaves/company/${companyId}`],
            });
            toast({ title: "Success", description: "Leave request rejected" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to reject leave",
                variant: "destructive",
            });
        },
    });

    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "default";
            case "rejected":
                return "destructive";
            case "pending":
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
                </div>
                <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Leave Approval</h1>
                    <p className="text-muted-foreground">
                        Review and approve team leave requests
                    </p>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                        className="w-40"
                        data-testid="select-status-filter">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4">
                {filteredLeaves.map((request) => {
                    const member = teamMembers.find(
                        (m) => m.id === request.userId
                    );
                    const days = calculateDays(
                        request.startDate,
                        request.endDate
                    );

                    return (
                        <Card
                            key={request.id}
                            data-testid={`card-leave-${request.id}`}>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            {member?.displayName ||
                                                "Unknown Employee"}
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {new Date(
                                                            request.startDate
                                                        ).toLocaleDateString()}{" "}
                                                        -{" "}
                                                        {new Date(
                                                            request.endDate
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        ({days} days)
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">
                                                        Type:
                                                    </span>{" "}
                                                    {request.leaveType}
                                                </div>
                                            </div>
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={getStatusColor(
                                            request.status
                                        )}>
                                        {request.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium mb-1">
                                        Reason:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {request.reason}
                                    </p>
                                </div>
                                {request.status === "pending" && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() =>
                                                approveLeave.mutate(request.id)
                                            }
                                            disabled={
                                                approveLeave.isPending ||
                                                rejectLeave.isPending
                                            }
                                            data-testid={`button-approve-${request.id}`}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                rejectLeave.mutate(request.id)
                                            }
                                            disabled={
                                                approveLeave.isPending ||
                                                rejectLeave.isPending
                                            }
                                            data-testid={`button-reject-${request.id}`}>
                                            <X className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredLeaves.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">
                            No {statusFilter !== "all" && statusFilter} leave
                            requests found
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
