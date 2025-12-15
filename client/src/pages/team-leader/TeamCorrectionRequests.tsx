import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, User } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CorrectionRequest {
    id: number;
    userId: number;
    requestedDate: string;
    originalClockIn?: string;
    originalClockOut?: string;
    correctedClockIn?: string;
    correctedClockOut?: string;
    reason: string;
    status: string;
    companyId: number;
    displayName?: string;
}

interface TeamMember {
    id: number;
    displayName: string;
}

export default function TeamCorrectionRequests() {
    const { dbUserId, companyId } = useAuth();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<string>("pending");

    const { data: teamMembers = [] } = useQuery<TeamMember[]>({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
    });

    const { data: teamCorrections = [], isLoading } = useQuery<
        CorrectionRequest[]
    >({
        queryKey: [`/api/corrections/team/${dbUserId}`],
        enabled: !!dbUserId,
    });

    const filteredCorrections =
        statusFilter === "all"
            ? teamCorrections
            : teamCorrections.filter((corr) => corr.status === statusFilter);

    const approveCorrection = useMutation({
        mutationFn: async (correctionId: number) => {
            return apiRequest(
                `${API_BASE_URL}/api/corrections/${correctionId}/approve`,
                "PATCH"
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/corrections/team/${dbUserId}`],
            });
            toast({
                title: "Success",
                description: "Correction request approved",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to approve correction",
                variant: "destructive",
            });
        },
    });

    const rejectCorrection = useMutation({
        mutationFn: async (correctionId: number) => {
            return apiRequest(
                `${API_BASE_URL}/api/corrections/${correctionId}/reject`,
                "PATCH"
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/corrections/team/${dbUserId}`],
            });
            toast({
                title: "Success",
                description: "Correction request rejected",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to reject correction",
                variant: "destructive",
            });
        },
    });

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "N/A";
        return new Date(timeStr).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
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
                    <h1 className="text-3xl font-bold">Correction Requests</h1>
                    <p className="text-muted-foreground">
                        Review and approve attendance correction requests
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
                {filteredCorrections.map((request) => {
                    const member = teamMembers.find(
                        (m) => m.id === request.userId
                    );

                    return (
                        <Card
                            key={request.id}
                            data-testid={`card-correction-${request.id}`}>
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
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        {new Date(
                                                            request.requestedDate
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {(request.originalClockIn ||
                                                    request.correctedClockIn) && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium">
                                                            Clock In:
                                                        </span>
                                                        <span className="text-destructive line-through">
                                                            {formatTime(
                                                                request.originalClockIn
                                                            )}
                                                        </span>
                                                        <span>→</span>
                                                        <span className="text-green-600 font-medium">
                                                            {formatTime(
                                                                request.correctedClockIn
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                {(request.originalClockOut ||
                                                    request.correctedClockOut) && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium">
                                                            Clock Out:
                                                        </span>
                                                        <span className="text-destructive line-through">
                                                            {formatTime(
                                                                request.originalClockOut
                                                            )}
                                                        </span>
                                                        <span>→</span>
                                                        <span className="text-green-600 font-medium">
                                                            {formatTime(
                                                                request.correctedClockOut
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
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
                                                approveCorrection.mutate(
                                                    request.id
                                                )
                                            }
                                            disabled={
                                                approveCorrection.isPending ||
                                                rejectCorrection.isPending
                                            }
                                            data-testid={`button-approve-correction-${request.id}`}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                rejectCorrection.mutate(
                                                    request.id
                                                )
                                            }
                                            disabled={
                                                approveCorrection.isPending ||
                                                rejectCorrection.isPending
                                            }
                                            data-testid={`button-reject-correction-${request.id}`}>
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

            {filteredCorrections.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">
                            No {statusFilter !== "all" && statusFilter}{" "}
                            correction requests found
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
