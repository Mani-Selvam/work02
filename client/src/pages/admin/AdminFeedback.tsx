import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, User, Shield, Users, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { Feedback, User as UserType } from "@shared/schema";

const RESPONSE_OPTIONS = ['Good', 'Bad', 'Excellent', 'Satisfactory', 'Needs Improvement'] as const;

export default function AdminFeedback() {
  const { toast } = useToast();
  const [selectedResponses, setSelectedResponses] = useState<Record<number, string>>({});

  const { data: feedbacks = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ feedbackId, adminResponse }: { feedbackId: number; adminResponse: string }) => {
      return await apiRequest(`${API_BASE_URL}/api/feedbacks/${feedbackId}/respond`, 'PATCH', { adminResponse });
    },
    onSuccess: (_data: unknown, variables: { feedbackId: number; adminResponse: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      toast({
        title: "Response sent",
        description: "Your feedback response has been sent successfully",
      });
      setSelectedResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[variables.feedbackId];
        return newResponses;
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send response",
        variant: "destructive",
      });
    },
  });

  const getUserById = (userId: number) => {
    return users.find((u: UserType) => u.id === userId);
  };

  const getRecipientIcon = (type: string) => {
    if (type === "Admin") return <Shield className="h-4 w-4 text-blue-600" />;
    if (type === "TeamLeader") return <Users className="h-4 w-4 text-purple-600" />;
    return <User className="h-4 w-4" />;
  };

  const handleResponseSubmit = (feedbackId: number) => {
    const response = selectedResponses[feedbackId];
    if (!response) {
      toast({
        title: "Please select a response",
        variant: "destructive",
      });
      return;
    }
    respondMutation.mutate({ feedbackId, adminResponse: response });
  };

  const pendingFeedbacks = feedbacks.filter((f: Feedback) => !f.adminResponse);
  const respondedFeedbacks = feedbacks.filter((f: Feedback) => f.adminResponse);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">User Feedback</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and respond to feedback submitted by users
        </p>
      </div>

      {/* Pending Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Pending Feedback ({pendingFeedbacks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {pendingFeedbacks.map((feedback: Feedback) => {
                const user = getUserById(feedback.submittedBy);
                return (
                  <div key={feedback.id} data-testid={`feedback-${feedback.id}`} className="p-4 space-y-4 border rounded-md">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarImage src={user?.photoURL || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.displayName?.charAt(0) || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">
                                  {user?.displayName || 'Unknown User'}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {user?.role || 'Member'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {user?.email || 'No email'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(feedback.createdAt), 'MMM dd, yyyy • h:mm a')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {getRecipientIcon(feedback.recipientType)}
                            <span className="text-xs text-muted-foreground">
                              Sent to: {feedback.recipientType === "TeamLeader" ? "Team Leader" : feedback.recipientType}
                            </span>
                          </div>

                          <p className="text-sm leading-relaxed bg-muted p-3 rounded-md">
                            {feedback.message}
                          </p>

                          <div className="flex gap-2 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <Select 
                                value={selectedResponses[feedback.id] || ""} 
                                onValueChange={(value) => setSelectedResponses({ ...selectedResponses, [feedback.id]: value })}
                              >
                                <SelectTrigger data-testid={`select-response-${feedback.id}`}>
                                  <SelectValue placeholder="Select response..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RESPONSE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option} data-testid={`option-${option.toLowerCase().replace(' ', '-')}`}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => handleResponseSubmit(feedback.id)}
                              disabled={respondMutation.isPending || !selectedResponses[feedback.id]}
                              data-testid={`button-respond-${feedback.id}`}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {respondMutation.isPending ? "Sending..." : "Send Response"}
                            </Button>
                          </div>
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No pending feedback</p>
                <p className="text-sm text-muted-foreground">
                  All feedback has been responded to
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responded Feedback */}
      {respondedFeedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Responded Feedback ({respondedFeedbacks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {respondedFeedbacks.map((feedback: Feedback) => {
                const user = getUserById(feedback.submittedBy);
                return (
                  <div key={feedback.id} className="border-green-200 dark:border-green-900 p-4 space-y-3 border rounded-md" data-testid={`responded-feedback-${feedback.id}`}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarImage src={user?.photoURL || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.displayName?.charAt(0) || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">
                                  {user?.displayName || 'Unknown User'}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {user?.role || 'Member'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {user?.email || 'No email'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(feedback.createdAt), 'MMM dd, yyyy')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {getRecipientIcon(feedback.recipientType)}
                            <span className="text-xs text-muted-foreground">
                              To: {feedback.recipientType === "TeamLeader" ? "Team Leader" : feedback.recipientType}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {feedback.message}
                          </p>

                          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-900">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Your Response:</p>
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100">{feedback.adminResponse}</p>
                            {feedback.respondedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Responded: {format(new Date(feedback.respondedAt), 'MMM dd, yyyy • h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
