import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Megaphone, MessageCircle, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type { GroupMessage, GroupMessageReply } from "@shared/schema";

function AnnouncementCard({ announcement }: { announcement: GroupMessage }) {
    const [showReplies, setShowReplies] = useState(false);
    const [replyText, setReplyText] = useState("");
    const { toast } = useToast();

    const user = localStorage.getItem("user");
    const userId = user ? JSON.parse(user).id : null;

    const { data: replies = [], isLoading: repliesLoading } = useQuery<
        GroupMessageReply[]
    >({
        queryKey: [`/api/group-messages/${announcement.id}/replies`, userId],
        queryFn: async () => {
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(
                `${API_BASE_URL}/api/group-messages/${announcement.id}/replies`,
                { headers, credentials: "include" }
            );
            if (!res.ok) throw new Error("Failed to fetch replies");
            return res.json();
        },
        enabled: showReplies,
    });

    const replyMutation = useMutation({
        mutationFn: async (message: string) => {
            return await apiRequest(
                `${API_BASE_URL}/api/group-messages/${announcement.id}/replies`,
                "POST",
                { message }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`/api/group-messages/${announcement.id}/replies`],
            });
            setReplyText("");
            toast({
                title: "Reply sent",
                description: "Your reply has been posted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to post reply",
                variant: "destructive",
            });
        },
    });

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        replyMutation.mutate(replyText);
    };

    return (
        <Card data-testid={`card-announcement-${announcement.id}`}>
            <CardHeader>
                <div className="flex items-start gap-3">
                    <Megaphone className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-1 min-w-0">
                        {announcement.title && (
                            <CardTitle className="text-base sm:text-lg break-words">
                                {announcement.title}
                            </CardTitle>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                            {format(
                                new Date(announcement.createdAt),
                                "MMMM dd, yyyy 'at' h:mm a"
                            )}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap break-words">
                    {announcement.message}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReplies(!showReplies)}
                        data-testid={`button-toggle-replies-${announcement.id}`}
                        className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {showReplies ? "Hide" : "Show"} Replies (
                        {replies.length})
                    </Button>
                </div>

                {showReplies && (
                    <div className="space-y-3 pt-2">
                        {repliesLoading ? (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                Loading replies...
                            </div>
                        ) : (
                            <>
                                {replies.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {replies.map((reply) => (
                                            <div
                                                key={reply.id}
                                                className="bg-muted/50 rounded-lg p-3"
                                                data-testid={`reply-${reply.id}`}>
                                                <p className="text-sm break-words">
                                                    {reply.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 font-mono">
                                                    {format(
                                                        new Date(
                                                            reply.createdAt
                                                        ),
                                                        "MMM dd, h:mm a"
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <form
                                    onSubmit={handleReplySubmit}
                                    className="space-y-2">
                                    <Textarea
                                        placeholder="Write a reply..."
                                        value={replyText}
                                        onChange={(e) =>
                                            setReplyText(e.target.value)
                                        }
                                        data-testid={`textarea-reply-${announcement.id}`}
                                        rows={2}
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={
                                            !replyText.trim() ||
                                            replyMutation.isPending
                                        }
                                        data-testid={`button-submit-reply-${announcement.id}`}
                                        className="gap-2">
                                        <Send className="h-3 w-3" />
                                        {replyMutation.isPending
                                            ? "Sending..."
                                            : "Reply"}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function TeamLeaderAnnouncements() {
    const { toast } = useToast();

    const {
        data: announcements = [],
        isLoading,
        refetch,
    } = useQuery<GroupMessage[]>({
        queryKey: ["/api/group-messages"],
    });

    // Real-time updates via WebSocket
    useWebSocket((data) => {
        // New announcement
        if (data.type === "NEW_GROUP_MESSAGE") {
            queryClient.invalidateQueries({
                queryKey: ["/api/group-messages"],
            });
            toast({
                title: "New Announcement",
                description:
                    data.data?.title || "A new announcement has been posted",
            });
        }

        // Reply to announcement
        if (data.type === "GROUP_MESSAGE_REPLY") {
            queryClient.invalidateQueries({
                queryKey: [
                    `/api/group-messages/${data.groupMessageId}/replies`,
                ],
            });
            // Also refresh the main announcements list to update reply counts
            queryClient.invalidateQueries({
                queryKey: ["/api/group-messages"],
            });
        }
    });

    const sortedAnnouncements = [...announcements].sort(
        (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-32 w-full bg-muted animate-pulse rounded" />
                <div className="h-32 w-full bg-muted animate-pulse rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Megaphone className="h-6 w-6 sm:h-8 sm:w-8" />
                    Announcements
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Company-wide announcements and updates
                </p>
            </div>

            <div className="space-y-4">
                {sortedAnnouncements.map((announcement) => (
                    <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                    />
                ))}

                {sortedAnnouncements.length === 0 && (
                    <Card>
                        <CardContent className="p-12">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <h3 className="text-lg font-semibold mb-2">
                                    No Announcements
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    There are no announcements to display at
                                    this time.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
