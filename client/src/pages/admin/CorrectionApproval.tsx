import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Check, X, FileEdit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { CorrectionRequest } from "@shared/schema";

type CorrectionWithUser = CorrectionRequest & { userName: string };

export default function CorrectionApproval() {
    const { toast } = useToast();
    const [reviewDialog, setReviewDialog] = useState<{
        open: boolean;
        request: CorrectionWithUser | null;
        action: "approve" | "reject" | null;
    }>({
        open: false,
        request: null,
        action: null,
    });
    const [comments, setComments] = useState("");

    const { data: corrections = [], isLoading } = useQuery<
        CorrectionWithUser[]
    >({
        queryKey: ["/api/admin/attendance/corrections/pending"],
    });

    const approveMutation = useMutation({
        mutationFn: async ({
            id,
            comments,
        }: {
            id: number;
            comments: string;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/admin/attendance/corrections/${id}/approve`,
                "PATCH",
                { comments }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/admin/attendance/corrections/pending"],
            });
            setReviewDialog({ open: false, request: null, action: null });
            setComments("");
            toast({
                title: "Request Approved",
                description:
                    "The correction request has been approved and applied.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description:
                    "Failed to approve correction request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({
            id,
            comments,
        }: {
            id: number;
            comments: string;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/admin/attendance/corrections/${id}/reject`,
                "PATCH",
                { comments }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/admin/attendance/corrections/pending"],
            });
            setReviewDialog({ open: false, request: null, action: null });
            setComments("");
            toast({
                title: "Request Rejected",
                description: "The correction request has been rejected.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description:
                    "Failed to reject correction request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleReview = () => {
        if (!reviewDialog.request) return;

        if (reviewDialog.action === "reject" && !comments.trim()) {
            toast({
                title: "Validation Error",
                description: "Please provide a reason for rejection.",
                variant: "destructive",
            });
            return;
        }

        const mutationData = { id: reviewDialog.request.id, comments };

        if (reviewDialog.action === "approve") {
            approveMutation.mutate(mutationData);
        } else if (reviewDialog.action === "reject") {
            rejectMutation.mutate(mutationData);
        }
    };

    const formatTime = (time: string | Date | null) => {
        if (!time) return "-";
        const date = typeof time === "string" ? new Date(time) : time;
        return format(date, "hh:mm a");
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">
                    Attendance Correction Requests
                </h1>
                <p className="text-muted-foreground mt-1">
                    Review and approve employee attendance correction requests
                </p>
            </div>

            <div className="space-y-4">
                {isLoading && (
                    <Card className="p-6">
                        <p className="text-center text-muted-foreground">
                            Loading...
                        </p>
                    </Card>
                )}

                {!isLoading && corrections.length === 0 && (
                    <Card className="p-6">
                        <div className="text-center py-8">
                            <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p
                                className="text-muted-foreground"
                                data-testid="text-no-pending">
                                No pending correction requests.
                            </p>
                        </div>
                    </Card>
                )}

                {corrections.map((correction) => (
                    <Card
                        key={correction.id}
                        className="overflow-hidden"
                        data-testid={`card-correction-${correction.id}`}>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <FileEdit className="w-5 h-5 text-muted-foreground" />
                                    <CardTitle
                                        className="text-lg"
                                        data-testid={`text-employee-${correction.id}`}>
                                        {correction.userName}
                                    </CardTitle>
                                    <Badge
                                        variant="secondary"
                                        data-testid={`status-correction-${correction.id}`}>
                                        Pending Review
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            setReviewDialog({
                                                open: true,
                                                request: correction,
                                                action: "approve",
                                            });
                                            setComments("");
                                        }}
                                        disabled={
                                            approveMutation.isPending ||
                                            rejectMutation.isPending
                                        }
                                        className="bg-green-600 hover:bg-green-700"
                                        data-testid={`button-approve-${correction.id}`}>
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setReviewDialog({
                                                open: true,
                                                request: correction,
                                                action: "reject",
                                            });
                                            setComments("");
                                        }}
                                        disabled={
                                            approveMutation.isPending ||
                                            rejectMutation.isPending
                                        }
                                        variant="destructive"
                                        data-testid={`button-reject-${correction.id}`}>
                                        <X className="h-4 w-4 mr-1" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span
                                        data-testid={`text-date-${correction.id}`}>
                                        {format(
                                            parseISO(correction.date),
                                            "MMM dd, yyyy"
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span
                                        data-testid={`text-submitted-${correction.id}`}>
                                        Submitted:{" "}
                                        {format(
                                            new Date(correction.createdAt),
                                            "MMM dd, yyyy 'at' hh:mm a"
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {correction.requestedCheckIn && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            Requested Check-In
                                        </p>
                                        <p
                                            className="text-sm text-muted-foreground"
                                            data-testid={`text-check-in-${correction.id}`}>
                                            {formatTime(
                                                correction.requestedCheckIn
                                            )}
                                        </p>
                                    </div>
                                )}
                                {correction.requestedCheckOut && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            Requested Check-Out
                                        </p>
                                        <p
                                            className="text-sm text-muted-foreground"
                                            data-testid={`text-check-out-${correction.id}`}>
                                            {formatTime(
                                                correction.requestedCheckOut
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <p className="text-sm font-medium mb-1">
                                    Reason for Correction
                                </p>
                                <p
                                    className="text-sm text-muted-foreground"
                                    data-testid={`text-reason-${correction.id}`}>
                                    {correction.reason}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog
                open={reviewDialog.open}
                onOpenChange={(open) => {
                    if (
                        !open &&
                        !approveMutation.isPending &&
                        !rejectMutation.isPending
                    ) {
                        setReviewDialog({
                            open: false,
                            request: null,
                            action: null,
                        });
                        setComments("");
                    }
                }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {reviewDialog.action === "approve"
                                ? "Approve"
                                : "Reject"}{" "}
                            Correction Request
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {reviewDialog.action === "approve"
                                    ? "Add optional comments about this approval:"
                                    : "Please provide a reason for rejection:"}
                            </p>
                        </div>
                        <Textarea
                            placeholder={
                                reviewDialog.action === "approve"
                                    ? "Optional comments..."
                                    : "Reason for rejection..."
                            }
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={4}
                            data-testid="input-review-comments"
                            disabled={
                                approveMutation.isPending ||
                                rejectMutation.isPending
                            }
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setReviewDialog({
                                    open: false,
                                    request: null,
                                    action: null,
                                });
                                setComments("");
                            }}
                            disabled={
                                approveMutation.isPending ||
                                rejectMutation.isPending
                            }
                            data-testid="button-cancel-review">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReview}
                            disabled={
                                approveMutation.isPending ||
                                rejectMutation.isPending
                            }
                            variant={
                                reviewDialog.action === "approve"
                                    ? "default"
                                    : "destructive"
                            }
                            data-testid="button-confirm-review">
                            {approveMutation.isPending ||
                            rejectMutation.isPending
                                ? "Processing..."
                                : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
