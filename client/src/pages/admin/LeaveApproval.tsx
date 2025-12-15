import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Check, X } from "lucide-react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useCallback } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Leave } from "@shared/schema";

type LeaveWithUser = Leave & { userName: string };

export default function LeaveApproval() {
    const { toast } = useToast();

    const { data: user } = useQuery<any>({
        queryKey: ["/api/me"],
    });

    const handleWebSocketMessage = useCallback(
        (data: any) => {
            if (
                data.type === "LEAVE_STATUS_UPDATE" &&
                data.data.companyId === user?.companyId
            ) {
                queryClient.invalidateQueries({
                    queryKey: ["/api/leaves/company", user?.companyId],
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
        [toast, user?.companyId]
    );

    useWebSocket(handleWebSocketMessage);

    const { data: leaves = [], isLoading } = useQuery<LeaveWithUser[]>({
        queryKey: ["/api/leaves/company", user?.companyId],
        enabled: !!user?.companyId,
    });

    const approveMutation = useMutation({
        mutationFn: async (leaveId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/leaves/${leaveId}/approve`,
                "PATCH",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/leaves/company", user?.companyId],
            });
            toast({
                title: "Leave approved",
                description:
                    "The leave request has been approved successfully.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description:
                    "Failed to approve leave request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (leaveId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/leaves/${leaveId}/reject`,
                "PATCH",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/leaves/company", user?.companyId],
            });
            toast({
                title: "Leave rejected",
                description: "The leave request has been rejected.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description:
                    "Failed to reject leave request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const changeStatusMutation = useMutation({
        mutationFn: async ({
            leaveId,
            status,
        }: {
            leaveId: number;
            status: string;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/leaves/${leaveId}/status`,
                "PATCH",
                { status }
            );
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["/api/leaves/company", user?.companyId],
            });
            toast({
                title: "Status updated",
                description: `Leave status changed to ${variables.status}`,
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update leave status. Please try again.",
                variant: "destructive",
            });
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "rejected":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            default:
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        }
    };

    const pendingLeaves = leaves.filter(
        (leave: any) => leave.status === "pending"
    );
    const processedLeaves = leaves.filter(
        (leave: any) => leave.status !== "pending"
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Leave Approvals
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Review and approve employee leave requests
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Pending Requests ({pendingLeaves.length})
                    </h2>
                    <div className="grid gap-4">
                        {isLoading && (
                            <Card className="p-6">
                                <p className="text-center text-gray-500 dark:text-gray-400">
                                    Loading...
                                </p>
                            </Card>
                        )}

                        {!isLoading && pendingLeaves.length === 0 && (
                            <Card className="p-6">
                                <p
                                    className="text-center text-gray-500 dark:text-gray-400"
                                    data-testid="text-no-pending">
                                    No pending leave requests.
                                </p>
                            </Card>
                        )}

                        {pendingLeaves.map((leave: any) => (
                            <Card
                                key={leave.id}
                                className="p-6"
                                data-testid={`card-leave-${leave.id}`}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3
                                                className="font-semibold text-lg"
                                                data-testid={`text-employee-${leave.id}`}>
                                                {leave.userName}
                                            </h3>
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                data-testid={`text-leave-type-${leave.id}`}>
                                                {leave.leaveType} Leave
                                            </span>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                    leave.status
                                                )}`}
                                                data-testid={`status-leave-${leave.id}`}>
                                                {leave.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span
                                                    data-testid={`text-dates-${leave.id}`}>
                                                    {new Date(
                                                        leave.startDate
                                                    ).toLocaleDateString()}{" "}
                                                    -{" "}
                                                    {new Date(
                                                        leave.endDate
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span
                                                    data-testid={`text-applied-${leave.id}`}>
                                                    Applied:{" "}
                                                    {new Date(
                                                        leave.appliedDate
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p
                                            className="text-sm text-gray-700 dark:text-gray-300"
                                            data-testid={`text-reason-${leave.id}`}>
                                            <span className="font-medium">
                                                Reason:
                                            </span>{" "}
                                            {leave.reason}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() =>
                                                approveMutation.mutate(leave.id)
                                            }
                                            disabled={
                                                approveMutation.isPending ||
                                                rejectMutation.isPending
                                            }
                                            className="bg-green-600 hover:bg-green-700"
                                            data-testid={`button-approve-${leave.id}`}>
                                            <Check className="h-4 w-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                rejectMutation.mutate(leave.id)
                                            }
                                            disabled={
                                                approveMutation.isPending ||
                                                rejectMutation.isPending
                                            }
                                            variant="destructive"
                                            data-testid={`button-reject-${leave.id}`}>
                                            <X className="h-4 w-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Processed Requests ({processedLeaves.length})
                    </h2>
                    <div className="grid gap-4">
                        {processedLeaves.length === 0 && (
                            <Card className="p-6">
                                <p
                                    className="text-center text-gray-500 dark:text-gray-400"
                                    data-testid="text-no-processed">
                                    No processed leave requests yet.
                                </p>
                            </Card>
                        )}

                        {processedLeaves.map((leave: any) => (
                            <Card
                                key={leave.id}
                                className="p-6"
                                data-testid={`card-processed-leave-${leave.id}`}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3
                                                className="font-semibold text-lg"
                                                data-testid={`text-employee-${leave.id}`}>
                                                {leave.userName}
                                            </h3>
                                            <span className="px-3 py-1 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {leave.leaveType} Leave
                                            </span>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                    leave.status
                                                )}`}>
                                                {leave.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {new Date(
                                                        leave.startDate
                                                    ).toLocaleDateString()}{" "}
                                                    -{" "}
                                                    {new Date(
                                                        leave.endDate
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    Applied:{" "}
                                                    {new Date(
                                                        leave.appliedDate
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">
                                                Reason:
                                            </span>{" "}
                                            {leave.reason}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <Select
                                            value={leave.status}
                                            onValueChange={(status) =>
                                                changeStatusMutation.mutate({
                                                    leaveId: leave.id,
                                                    status,
                                                })
                                            }
                                            disabled={
                                                changeStatusMutation.isPending
                                            }>
                                            <SelectTrigger
                                                className="w-32"
                                                data-testid={`select-status-${leave.id}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">
                                                    Pending
                                                </SelectItem>
                                                <SelectItem value="approved">
                                                    Approved
                                                </SelectItem>
                                                <SelectItem value="rejected">
                                                    Rejected
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
