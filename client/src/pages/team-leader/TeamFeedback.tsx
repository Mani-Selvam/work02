import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Feedback {
    id: number;
    submittedBy: number;
    recipientType: string;
    message: string;
    createdAt: string;
    submitterName?: string | null;
    submitterRole?: string | null;
}

export default function TeamFeedback() {
    const { dbUserId, companyId } = useAuth();
    const { toast } = useToast();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [recipientType, setRecipientType] = useState<"Admin" | "TeamLeader">(
        "Admin"
    );

    const { data: teamFeedbackList = [], isLoading: loadingFeedbacks } =
        useQuery<Feedback[]>({
            queryKey: ["/api/feedbacks"],
            enabled: !!companyId,
        });

    const feedbackStats = useMemo(() => {
        const positive = teamFeedbackList.filter(
            (f) =>
                f.message.toLowerCase().includes("great") ||
                f.message.toLowerCase().includes("excellent") ||
                f.message.toLowerCase().includes("good job") ||
                f.message.toLowerCase().includes("well done")
        ).length;

        const concern = teamFeedbackList.filter(
            (f) =>
                f.message.toLowerCase().includes("concern") ||
                f.message.toLowerCase().includes("issue") ||
                f.message.toLowerCase().includes("problem")
        ).length;

        const suggestion = teamFeedbackList.length - positive - concern;

        return { positive, concern, suggestion };
    }, [teamFeedbackList]);

    const getTypeIcon = (message: string) => {
        const lowerMessage = message.toLowerCase();
        if (
            lowerMessage.includes("great") ||
            lowerMessage.includes("excellent") ||
            lowerMessage.includes("good job") ||
            lowerMessage.includes("well done")
        ) {
            return <ThumbsUp className="h-4 w-4 text-green-600" />;
        }
        if (
            lowerMessage.includes("concern") ||
            lowerMessage.includes("issue") ||
            lowerMessage.includes("problem")
        ) {
            return <ThumbsDown className="h-4 w-4 text-red-600" />;
        }
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
    };

    const getTypeBadge = (message: string) => {
        const lowerMessage = message.toLowerCase();
        if (
            lowerMessage.includes("great") ||
            lowerMessage.includes("excellent") ||
            lowerMessage.includes("good job") ||
            lowerMessage.includes("well done")
        ) {
            return (
                <Badge variant="default" className="bg-green-600">
                    Positive
                </Badge>
            );
        }
        if (
            lowerMessage.includes("concern") ||
            lowerMessage.includes("issue") ||
            lowerMessage.includes("problem")
        ) {
            return <Badge variant="destructive">Concern</Badge>;
        }
        return <Badge variant="default">Suggestion</Badge>;
    };

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
                description: `Your feedback has been submitted to ${recipientType}`,
            });
            setFeedbackMessage("");
            setIsSubmitDialogOpen(false);
            queryClient.invalidateQueries({
                queryKey: ["/api/feedbacks"],
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit feedback",
                variant: "destructive",
            });
        },
    });

    const handleSubmitFeedback = () => {
        if (!feedbackMessage.trim()) {
            toast({
                title: "Error",
                description: "Please enter your feedback",
                variant: "destructive",
            });
            return;
        }
        submitFeedbackMutation.mutate({
            message: feedbackMessage,
            recipientType,
        });
    };

    const filteredFeedbackList = selectedType
        ? teamFeedbackList.filter((f) => {
              const lowerMessage = f.message.toLowerCase();
              if (selectedType === "positive") {
                  return (
                      lowerMessage.includes("great") ||
                      lowerMessage.includes("excellent") ||
                      lowerMessage.includes("good job") ||
                      lowerMessage.includes("well done")
                  );
              }
              if (selectedType === "concern") {
                  return (
                      lowerMessage.includes("concern") ||
                      lowerMessage.includes("issue") ||
                      lowerMessage.includes("problem")
                  );
              }
              return (
                  !lowerMessage.includes("great") &&
                  !lowerMessage.includes("excellent") &&
                  !lowerMessage.includes("good job") &&
                  !lowerMessage.includes("well done") &&
                  !lowerMessage.includes("concern") &&
                  !lowerMessage.includes("issue") &&
                  !lowerMessage.includes("problem")
              );
          })
        : teamFeedbackList;

    if (loadingFeedbacks) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Team Feedback</h1>
                    <p className="text-muted-foreground">
                        Review feedback from your team members
                    </p>
                </div>
                <Button
                    onClick={() => setIsSubmitDialogOpen(true)}
                    data-testid="button-provide-feedback">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Provide Feedback
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card
                    className="cursor-pointer hover-elevate"
                    onClick={() =>
                        setSelectedType(
                            selectedType === "positive" ? null : "positive"
                        )
                    }
                    data-testid="card-filter-positive">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Positive
                        </CardTitle>
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-positive">
                            {feedbackStats.positive}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Team feedback
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover-elevate"
                    onClick={() =>
                        setSelectedType(
                            selectedType === "suggestion" ? null : "suggestion"
                        )
                    }
                    data-testid="card-filter-suggestion">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Suggestions
                        </CardTitle>
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-suggestions">
                            {feedbackStats.suggestion}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Team feedback
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover-elevate"
                    onClick={() =>
                        setSelectedType(
                            selectedType === "concern" ? null : "concern"
                        )
                    }
                    data-testid="card-filter-concern">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Concerns
                        </CardTitle>
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="stat-concerns">
                            {feedbackStats.concern}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Team feedback
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4">
                {filteredFeedbackList.map((feedback) => (
                    <Card
                        key={feedback.id}
                        data-testid={`card-feedback-${feedback.id}`}>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            {feedback.submitterName
                                                ?.split(" ")
                                                .map((n) => n[0])
                                                .join("") || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getTypeIcon(feedback.message)}
                                            <CardTitle className="text-base">
                                                Feedback from{" "}
                                                {feedback.submitterName ||
                                                    "Unknown User"}
                                            </CardTitle>
                                            {feedback.submitterRole ===
                                                "company_admin" && (
                                                <Badge variant="secondary">
                                                    Admin
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(
                                                feedback.createdAt
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {getTypeBadge(feedback.message)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {feedback.message}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-respond-${feedback.id}`}>
                                    Respond
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-archive-${feedback.id}`}>
                                    Archive
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredFeedbackList.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p
                            className="text-muted-foreground"
                            data-testid="text-no-feedback">
                            {selectedType
                                ? `No ${selectedType} feedback found`
                                : "No feedback received yet"}
                        </p>
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={isSubmitDialogOpen}
                onOpenChange={setIsSubmitDialogOpen}>
                <DialogContent data-testid="dialog-submit-feedback">
                    <DialogHeader>
                        <DialogTitle>Submit Feedback</DialogTitle>
                        <DialogDescription>
                            Share your feedback with the admin or other team
                            leaders
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="recipient">Send to</Label>
                            <Select
                                value={recipientType}
                                onValueChange={(value) =>
                                    setRecipientType(
                                        value as "Admin" | "TeamLeader"
                                    )
                                }>
                                <SelectTrigger
                                    id="recipient"
                                    data-testid="select-recipient">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="TeamLeader">
                                        Team Leader
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                placeholder="Enter your feedback here..."
                                value={feedbackMessage}
                                onChange={(e) =>
                                    setFeedbackMessage(e.target.value)
                                }
                                rows={5}
                                data-testid="textarea-feedback-message"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsSubmitDialogOpen(false)}
                            data-testid="button-cancel-feedback">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={submitFeedbackMutation.isPending}
                            data-testid="button-submit-feedback">
                            {submitFeedbackMutation.isPending
                                ? "Submitting..."
                                : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
