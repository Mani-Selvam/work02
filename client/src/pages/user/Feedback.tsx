import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { MessageSquare, User, Shield, Users } from "lucide-react";
import type { Feedback } from "@shared/schema";

export default function Feedback() {
    const [message, setMessage] = useState("");
    const [recipientType, setRecipientType] = useState<"Admin" | "TeamLeader">(
        "Admin"
    );
    const { toast } = useToast();
    const { dbUserId } = useAuth();

    const { data: submittedFeedbacks = [], isLoading: loadingFeedbacks } =
        useQuery<Feedback[]>({
            queryKey: [`/api/feedbacks?submittedBy=${dbUserId}`],
            queryFn: async () => {
                const user = localStorage.getItem("user");
                const userId = user ? JSON.parse(user).id : null;
                const headers: Record<string, string> = {};
                if (userId) {
                    headers["x-user-id"] = userId.toString();
                }

                const res = await fetch(
                    `${API_BASE_URL}/api/feedbacks?submittedBy=${dbUserId}`,
                    { headers, credentials: "include" }
                );
                if (!res.ok) throw new Error("Failed to fetch feedbacks");
                return res.json();
            },
            enabled: !!dbUserId,
        });

    const submitFeedbackMutation = useMutation({
        mutationFn: async (data: {
            message: string;
            recipientType: string;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/feedbacks`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: `Your feedback has been submitted to ${
                    recipientType === "Admin" ? "Admin" : "Team Leader"
                }`,
            });
            setMessage("");
            queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
            queryClient.invalidateQueries({
                queryKey: [`/api/feedbacks?submittedBy=${dbUserId}`],
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit feedback",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = async () => {
        if (!message.trim()) {
            toast({
                title: "Error",
                description: "Please enter your feedback",
                variant: "destructive",
            });
            return;
        }

        submitFeedbackMutation.mutate({ message, recipientType });
    };

    const getRecipientIcon = (type: string) => {
        if (type === "Admin") return <Shield className="h-4 w-4" />;
        if (type === "TeamLeader") return <Users className="h-4 w-4" />;
        return <User className="h-4 w-4" />;
    };

    const getStatusBadge = (feedback: Feedback) => {
        if (feedback.adminResponse) {
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    Responded
                </span>
            );
        }
        return (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                Pending
            </span>
        );
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Feedback</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Share your feedback with Admin or Team Leader
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Submit New Feedback
                    </CardTitle>
                    <CardDescription>
                        Choose who will receive your feedback and share your
                        thoughts
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipient-type">Send Feedback To</Label>
                        <Select
                            value={recipientType}
                            onValueChange={(value: "Admin" | "TeamLeader") =>
                                setRecipientType(value)
                            }>
                            <SelectTrigger
                                id="recipient-type"
                                data-testid="select-recipient-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    value="Admin"
                                    data-testid="option-admin">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Admin
                                    </div>
                                </SelectItem>
                                <SelectItem
                                    value="TeamLeader"
                                    data-testid="option-team-leader">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Team Leader
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="feedback-message">Your Feedback</Label>
                        <Textarea
                            id="feedback-message"
                            placeholder="Enter your feedback here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                            data-testid="textarea-feedback"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={submitFeedbackMutation.isPending}
                        data-testid="button-submit-feedback"
                        className="w-full sm:w-auto">
                        {submitFeedbackMutation.isPending
                            ? "Submitting..."
                            : "Submit Feedback"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Submitted Feedback ({submittedFeedbacks.length})
                    </CardTitle>
                    <CardDescription>
                        Track the status and responses to your feedback
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingFeedbacks ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : submittedFeedbacks.length > 0 ? (
                        <div className="space-y-4">
                            {submittedFeedbacks.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    data-testid={`feedback-${feedback.id}`}
                                    className="p-4 space-y-3 border rounded-md">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {getRecipientIcon(
                                                feedback.recipientType
                                            )}
                                            <span className="text-sm font-medium">
                                                To:{" "}
                                                {feedback.recipientType ===
                                                "TeamLeader"
                                                    ? "Team Leader"
                                                    : feedback.recipientType}
                                            </span>
                                        </div>
                                        {getStatusBadge(feedback)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {feedback.message}
                                    </p>
                                    {feedback.adminResponse && (
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Admin Response:
                                            </p>
                                            <p className="text-sm font-semibold text-primary">
                                                {feedback.adminResponse}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Submitted:{" "}
                                        {new Date(
                                            feedback.createdAt
                                        ).toLocaleDateString()}{" "}
                                        at{" "}
                                        {new Date(
                                            feedback.createdAt
                                        ).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No feedback submitted yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
