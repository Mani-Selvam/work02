import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    FileEdit,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { CorrectionRequest } from "@shared/schema";

export default function CorrectionRequests() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        date: "",
        requestedCheckIn: "",
        requestedCheckOut: "",
        reason: "",
    });

    const { data: corrections, isLoading } = useQuery<CorrectionRequest[]>({
        queryKey: ["/api/attendance/my-corrections"],
    });

    const createCorrectionMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const checkInDateTime = data.requestedCheckIn
                ? new Date(
                      `${data.date}T${data.requestedCheckIn}:00`
                  ).toISOString()
                : null;
            const checkOutDateTime = data.requestedCheckOut
                ? new Date(
                      `${data.date}T${data.requestedCheckOut}:00`
                  ).toISOString()
                : null;

            return await apiRequest(
                `${API_BASE_URL}/api/attendance/correction-request`,
                "POST",
                {
                    date: data.date,
                    requestedCheckIn: checkInDateTime,
                    requestedCheckOut: checkOutDateTime,
                    reason: data.reason,
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/my-corrections"],
            });
            setIsDialogOpen(false);
            setFormData({
                date: "",
                requestedCheckIn: "",
                requestedCheckOut: "",
                reason: "",
            });
            toast({
                title: "Request Submitted",
                description:
                    "Your correction request has been submitted for review.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Submission Failed",
                description:
                    error.message ||
                    "Unable to submit request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.date || !formData.reason) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }
        createCorrectionMutation.mutate(formData);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending":
                return <Clock className="w-4 h-4 text-yellow-600" />;
            case "approved":
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "rejected":
                return <XCircle className="w-4 h-4 text-red-600" />;
            default:
                return (
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                );
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            pending: { variant: "secondary", label: "Pending" },
            approved: { variant: "default", label: "Approved" },
            rejected: { variant: "destructive", label: "Rejected" },
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

    const pendingCount =
        corrections?.filter((c) => c.status === "pending").length || 0;
    const approvedCount =
        corrections?.filter((c) => c.status === "approved").length || 0;
    const rejectedCount =
        corrections?.filter((c) => c.status === "rejected").length || 0;

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Correction Requests
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Request corrections for your attendance records
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button data-testid="button-new-request">
                            <FileEdit className="w-4 h-4 mr-2" />
                            New Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit Correction Request</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            date: e.target.value,
                                        })
                                    }
                                    max={new Date().toISOString().split("T")[0]}
                                    required
                                    data-testid="input-correction-date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="checkIn">
                                    Requested Check-In Time
                                </Label>
                                <Input
                                    id="checkIn"
                                    type="time"
                                    value={formData.requestedCheckIn}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            requestedCheckIn: e.target.value,
                                        })
                                    }
                                    data-testid="input-check-in-time"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty if no change needed
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="checkOut">
                                    Requested Check-Out Time
                                </Label>
                                <Input
                                    id="checkOut"
                                    type="time"
                                    value={formData.requestedCheckOut}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            requestedCheckOut: e.target.value,
                                        })
                                    }
                                    data-testid="input-check-out-time"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty if no change needed
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason *</Label>
                                <Textarea
                                    id="reason"
                                    value={formData.reason}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            reason: e.target.value,
                                        })
                                    }
                                    placeholder="Please explain why you need this correction..."
                                    rows={4}
                                    required
                                    data-testid="input-correction-reason"
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    data-testid="button-cancel">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        createCorrectionMutation.isPending
                                    }
                                    data-testid="button-submit-request">
                                    {createCorrectionMutation.isPending
                                        ? "Submitting..."
                                        : "Submit Request"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">
                                    Pending
                                </div>
                                <div
                                    className="text-2xl font-semibold"
                                    data-testid="text-pending-count">
                                    {pendingCount}
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
                                    Approved
                                </div>
                                <div
                                    className="text-2xl font-semibold"
                                    data-testid="text-approved-count">
                                    {approvedCount}
                                </div>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">
                                    Rejected
                                </div>
                                <div
                                    className="text-2xl font-semibold"
                                    data-testid="text-rejected-count">
                                    {rejectedCount}
                                </div>
                            </div>
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Requests</CardTitle>
                    <CardDescription>
                        View and track all your correction requests
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : !corrections || corrections.length === 0 ? (
                        <div className="text-center py-12">
                            <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                No correction requests found
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Submit a request if you need to correct your
                                attendance
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {corrections.map((correction) => (
                                <Card
                                    key={correction.id}
                                    className="overflow-hidden"
                                    data-testid={`correction-${correction.id}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                            <div className="flex-1 min-w-0 space-y-3">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(
                                                            correction.status
                                                        )}
                                                        <span className="font-semibold">
                                                            {format(
                                                                parseISO(
                                                                    correction.date
                                                                ),
                                                                "MMM dd, yyyy"
                                                            )}
                                                        </span>
                                                    </div>
                                                    {getStatusBadge(
                                                        correction.status
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {correction.requestedCheckIn && (
                                                        <div className="text-sm">
                                                            <span className="text-muted-foreground">
                                                                Requested
                                                                Check-In:{" "}
                                                            </span>
                                                            <span className="font-medium">
                                                                {formatTime(
                                                                    correction.requestedCheckIn
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {correction.requestedCheckOut && (
                                                        <div className="text-sm">
                                                            <span className="text-muted-foreground">
                                                                Requested
                                                                Check-Out:{" "}
                                                            </span>
                                                            <span className="font-medium">
                                                                {formatTime(
                                                                    correction.requestedCheckOut
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">
                                                        Reason:{" "}
                                                    </span>
                                                    <p className="mt-1">
                                                        {correction.reason}
                                                    </p>
                                                </div>

                                                {correction.reviewComments && (
                                                    <div className="text-sm bg-muted p-3 rounded-md">
                                                        <span className="font-medium">
                                                            Review Comments:{" "}
                                                        </span>
                                                        <p className="mt-1">
                                                            {
                                                                correction.reviewComments
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="text-xs text-muted-foreground">
                                                    Submitted on{" "}
                                                    {format(
                                                        new Date(
                                                            correction.createdAt
                                                        ),
                                                        "MMM dd, yyyy 'at' hh:mm a"
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
