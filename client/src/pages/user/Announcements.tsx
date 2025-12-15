import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Megaphone, MessageCircle, Send, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/contexts/AuthContext";
import type { GroupMessage, GroupMessageReply } from "@shared/schema";

interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    message: string;
    messageType: string;
    readStatus: boolean;
    createdAt: string;
}

interface User {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
    role: string;
}

function AdminMessageCard({
    message,
    sender,
}: {
    message: Message;
    sender?: User;
}) {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card data-testid={`admin-message-${message.id}`}>
            <CardHeader>
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={sender?.photoURL}
                            alt={sender?.displayName}
                        />
                        <AvatarFallback>
                            {sender ? getInitials(sender.displayName) : "AD"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">
                                {sender?.displayName || "Administrator"}
                            </CardTitle>
                            {!message.readStatus && (
                                <Badge variant="secondary">New</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                            {format(
                                new Date(message.createdAt),
                                "MMM dd, yyyy 'at' h:mm a"
                            )}
                        </p>
                    </div>
                    <Mail className="h-5 w-5 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                </p>
            </CardContent>
        </Card>
    );
}

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
                    <div className="flex-1">
                        {announcement.title && (
                            <CardTitle className="text-lg mb-2">
                                {announcement.title}
                            </CardTitle>
                        )}
                        <p className="text-sm text-muted-foreground font-mono">
                            {format(
                                new Date(announcement.createdAt),
                                "MMM dd, yyyy HH:mm"
                            )}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm whitespace-pre-wrap">
                    {announcement.message}
                </p>

                <div className="border-t pt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowReplies(!showReplies)}
                        data-testid={`button-toggle-replies-${announcement.id}`}>
                        <MessageCircle className="h-4 w-4" />
                        {showReplies ? "Hide" : "Show"} Replies{" "}
                        {replies.length > 0 && `(${replies.length})`}
                    </Button>

                    {showReplies && (
                        <div className="mt-4 space-y-4">
                            {repliesLoading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <>
                                    {replies.length > 0 && (
                                        <div
                                            className="space-y-3"
                                            data-testid={`replies-list-${announcement.id}`}>
                                            {replies.map((reply) => (
                                                <div
                                                    key={reply.id}
                                                    className="bg-muted rounded-md p-3"
                                                    data-testid={`reply-${reply.id}`}>
                                                    <p className="text-sm whitespace-pre-wrap">
                                                        {reply.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {format(
                                                            new Date(
                                                                reply.createdAt
                                                            ),
                                                            "MMM dd, yyyy HH:mm"
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
                                            placeholder="Write your reply..."
                                            value={replyText}
                                            onChange={(e) =>
                                                setReplyText(e.target.value)
                                            }
                                            className="min-h-[80px]"
                                            data-testid={`textarea-reply-${announcement.id}`}
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={
                                                !replyText.trim() ||
                                                replyMutation.isPending
                                            }
                                            className="gap-2"
                                            data-testid={`button-submit-reply-${announcement.id}`}>
                                            {replyMutation.isPending ? (
                                                <>Sending...</>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" />
                                                    Send Reply
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Announcements() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();

    const {
        data: announcements = [],
        isLoading: loadingAnnouncements,
        refetch: refetchAnnouncements,
    } = useQuery<GroupMessage[]>({
        queryKey: ["/api/group-messages"],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(`${API_BASE_URL}/api/group-messages`, {
                headers,
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch announcements");
            return res.json();
        },
    });

    const {
        data: allMessages = [],
        isLoading: loadingMessages,
        refetch: refetchMessages,
    } = useQuery<Message[]>({
        queryKey: ["/api/messages"],
        enabled: !!dbUserId,
    });

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const adminMessages = allMessages
        .filter(
            (msg) =>
                msg.receiverId === dbUserId &&
                msg.messageType === "admin_to_employee"
        )
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

    const sortedAnnouncements = [...announcements].sort(
        (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const getSenderInfo = (senderId: number) => {
        return users.find((u) => u.id === senderId);
    };

    // Real-time updates via WebSocket
    useWebSocket((data) => {
        // New group message/announcement
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

        // New message (from admin or team leader)
        if (data.type === "NEW_MESSAGE") {
            const messageData = data.data;
            // Refresh if employee receives any message
            if (messageData.receiverId === dbUserId) {
                queryClient.invalidateQueries({
                    queryKey: ["/api/messages"],
                });
                toast({
                    title: "New Message",
                    description: `${
                        messageData.senderName
                    }: ${messageData.message.substring(0, 50)}${
                        messageData.message.length > 50 ? "..." : ""
                    }`,
                });
            }
        }

        // Reply to group message
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

    if (loadingAnnouncements || loadingMessages) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                    Announcements
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Messages from administration and company-wide updates
                </p>
            </div>

            {adminMessages.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Admin Messages ({adminMessages.length})
                    </h3>
                    <div className="space-y-3">
                        {adminMessages.map((message) => (
                            <AdminMessageCard
                                key={`admin-${message.id}`}
                                message={message}
                                sender={getSenderInfo(message.senderId)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Company Announcements ({sortedAnnouncements.length})
                </h3>
                {sortedAnnouncements.length > 0 ? (
                    <div className="space-y-4">
                        {sortedAnnouncements.map((announcement) => (
                            <AnnouncementCard
                                key={`announcement-${announcement.id}`}
                                announcement={announcement}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8">
                            <div className="text-center">
                                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    No company announcements yet
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
