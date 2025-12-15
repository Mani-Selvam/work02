import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { MessageSquare, Send, Users, ArrowLeft, Search } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { User, Message, GroupMessage } from "@shared/schema";
import { Textarea as TextareaComponent } from "@/components/ui/textarea";

type ConversationType = "direct" | "group";
interface Conversation {
    id: string;
    type: ConversationType;
    userId?: number;
    userName?: string;
    userRole?: string;
    userPhoto?: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount?: number;
}

export default function AdminMessages() {
    const { toast } = useToast();
    const { dbUserId } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [selectedConversation, setSelectedConversation] =
        useState<Conversation | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [showConversationList, setShowConversationList] = useState(true);

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const { data: privateMessages = [] } = useQuery<Message[]>({
        queryKey: ["/api/messages"],
    });

    const { data: groupMessages = [] } = useQuery<GroupMessage[]>({
        queryKey: ["/api/group-messages"],
    });

    // Real-time updates
    useWebSocket((data) => {
        if (data.type === "NEW_MESSAGE") {
            queryClient.invalidateQueries({
                queryKey: ["/api/messages"],
            });
        }
        if (data.type === "NEW_GROUP_MESSAGE") {
            queryClient.invalidateQueries({
                queryKey: ["/api/group-messages"],
            });
        }
    });

    // Build conversations from messages and all available users
    useEffect(() => {
        const convMap = new Map<string, Conversation>();

        // First, add all team members and team leaders as conversation starters
        const teamUsers = users.filter(
            (u) =>
                u.id !== dbUserId &&
                (u.role === "company_member" || u.role === "team_leader")
        );
        teamUsers.forEach((user) => {
            const key = `direct-${user.id}`;
            convMap.set(key, {
                id: key,
                type: "direct",
                userId: user.id,
                userName: user.displayName || "Unknown",
                userRole: user.role || "",
                userPhoto: user.photoURL || "",
                lastMessage: "No messages yet",
                lastMessageTime: new Date(0),
                unreadCount: 0,
            });
        });

        // Then update with actual messages
        privateMessages.forEach((msg) => {
            const otherUserId =
                msg.senderId === dbUserId ? msg.receiverId : msg.senderId;
            const otherUser = users.find((u) => u.id === otherUserId);
            const key = `direct-${otherUserId}`;

            if (convMap.has(key)) {
                const lastMessageTime = new Date(msg.createdAt);
                const current = convMap.get(key)!;

                if (
                    lastMessageTime > (current.lastMessageTime || new Date(0))
                ) {
                    convMap.set(key, {
                        ...current,
                        lastMessage: msg.message,
                        lastMessageTime,
                        unreadCount: msg.readStatus
                            ? 0
                            : (current.unreadCount || 0) + 1,
                    });
                }
            }
        });

        // Group conversations (always shown as single group chat)
        if (groupMessages.length > 0) {
            const lastGroup = groupMessages.sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            )[0];
            convMap.set("group-all", {
                id: "group-all",
                type: "group",
                userName: "Announcements",
                lastMessage:
                    lastGroup?.title || lastGroup?.message || "No messages",
                lastMessageTime: new Date(lastGroup?.createdAt || Date.now()),
                unreadCount: 0,
            });
        }

        // Sort by most recent message first, then by user name
        const sorted = Array.from(convMap.values()).sort((a, b) => {
            // Group announcements always at top
            if (a.type === "group") return -1;
            if (b.type === "group") return 1;

            // Then sort by most recent message
            const timeA = a.lastMessageTime?.getTime() || 0;
            const timeB = b.lastMessageTime?.getTime() || 0;

            if (timeA !== timeB) return timeB - timeA;

            // If same time, sort by name
            return (a.userName || "").localeCompare(b.userName || "");
        });

        setConversations(sorted);
    }, [privateMessages, groupMessages, users, dbUserId]);

    const sendPrivateMessageMutation = useMutation({
        mutationFn: async ({
            receiverId,
            message,
            role,
        }: {
            receiverId: number;
            message: string;
            role?: string;
        }) => {
            // Determine messageType based on recipient role
            let messageType = "direct_message";
            if (role === "team_leader") {
                messageType = "admin_to_team_leader";
            } else if (role === "company_member") {
                messageType = "admin_to_employee";
            }

            return await apiRequest(`${API_BASE_URL}/api/messages`, "POST", {
                senderId: dbUserId,
                receiverId,
                message,
                messageType,
                readStatus: false,
            });
        },
        onSuccess: () => {
            setMessageInput("");
            queryClient.invalidateQueries({
                queryKey: ["/api/messages"],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to send message",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const sendGroupMessageMutation = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/group-messages`,
                "POST",
                {
                    message,
                    title: null,
                }
            );
        },
        onSuccess: () => {
            setMessageInput("");
            queryClient.invalidateQueries({
                queryKey: ["/api/group-messages"],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to send message",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConversation) return;

        if (
            selectedConversation.type === "direct" &&
            selectedConversation.userId
        ) {
            sendPrivateMessageMutation.mutate({
                receiverId: selectedConversation.userId,
                message: messageInput,
                role: selectedConversation.userRole,
            });
        } else if (selectedConversation.type === "group") {
            sendGroupMessageMutation.mutate({
                message: messageInput,
            });
        }
    };

    const getConversationMessages = () => {
        if (!selectedConversation) return [];

        if (
            selectedConversation.type === "direct" &&
            selectedConversation.userId
        ) {
            return privateMessages
                .filter(
                    (msg) =>
                        (msg.senderId === dbUserId &&
                            msg.receiverId === selectedConversation.userId) ||
                        (msg.receiverId === dbUserId &&
                            msg.senderId === selectedConversation.userId)
                )
                .sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                );
        }

        if (selectedConversation.type === "group") {
            return groupMessages.sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            );
        }

        return [];
    };

    const formatTime = (date: Date) => {
        if (isToday(date)) return format(date, "HH:mm");
        if (isYesterday(date)) return "Yesterday";
        return format(date, "MMM dd");
    };

    const filteredConversations = conversations.filter((conv) =>
        conv.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [getConversationMessages()]);

    const messages = getConversationMessages();

    return (
        <div className="h-[80vh] md:h-[90vh] w-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row gap-0 bg-background overflow-hidden min-w-0 w-full">
                {/* Conversations List */}
                <div
                    className={`${
                        showConversationList ? "flex" : "hidden"
                    } md:flex w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border flex-col min-h-0`}>
                    <div className="flex-shrink-0 p-3 sm:p-4 lg:p-5 border-b border-border space-y-3">
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                            Chats
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm"
                                data-testid="input-search-conversations"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        <div className="space-y-1 p-2">
                            {filteredConversations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No conversations yet
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConversation(conv);
                                            setShowConversationList(false);
                                        }}
                                        className={`w-full text-left p-2 sm:p-3 rounded-lg transition-colors hover:bg-accent ${
                                            selectedConversation?.id === conv.id
                                                ? "bg-primary/10 border border-primary"
                                                : ""
                                        }`}
                                        data-testid={`conv-${conv.id}`}>
                                        <div className="flex items-start gap-2 sm:gap-3">
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                <AvatarFallback className="text-xs">
                                                    {conv.type === "group" ? (
                                                        <Users className="h-5 w-5" />
                                                    ) : (
                                                        conv.userName?.[0] ||
                                                        "?"
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium text-sm truncate">
                                                        {conv.userName}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                                        {conv.lastMessageTime &&
                                                            formatTime(
                                                                conv.lastMessageTime
                                                            )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate mt-1">
                                                    {conv.lastMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                {selectedConversation ? (
                    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                        <div className="flex flex-col h-full min-h-0 overflow-hidden">
                            {/* Chat Header - Fixed at Top */}
                            <div className="flex-shrink-0 sticky top-0 z-50 border-b border-border px-3 sm:px-4 lg:px-5 py-2 sm:py-2 flex items-center gap-3 bg-background shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowConversationList(true);
                                        setSelectedConversation(null);
                                    }}
                                    className="md:hidden h-8 w-8"
                                    data-testid="button-back-to-conversations">
                                    <ArrowLeft className="h-3 w-3" />
                                </Button>
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage
                                        src={selectedConversation.userPhoto}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {selectedConversation.type ===
                                        "group" ? (
                                            <Users className="h-4 w-4" />
                                        ) : (
                                            selectedConversation
                                                .userName?.[0] || "?"
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs sm:text-sm truncate">
                                        {selectedConversation.userName}
                                    </p>
                                    {selectedConversation.type === "direct" &&
                                        selectedConversation.userRole && (
                                            <p className="text-xs text-muted-foreground leading-tight">
                                                {selectedConversation.userRole ===
                                                "team_leader"
                                                    ? "Team Leader"
                                                    : "Team Member"}
                                            </p>
                                        )}
                                </div>
                            </div>

                            {/* Messages - Scrollable */}
                            <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-5 py-1 sm:py-2 hide-scrollbar">
                                <div className="space-y-1 sm:space-y-2 flex flex-col">
                                    {messages.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No messages yet. Start a
                                            conversation!
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isOwn =
                                                "senderId" in msg &&
                                                msg.senderId === dbUserId;
                                            return (
                                                <div
                                                    key={`${msg.id}-${idx}`}
                                                    className={`flex ${
                                                        isOwn
                                                            ? "justify-end"
                                                            : "justify-start"
                                                    }`}
                                                    data-testid={`message-${msg.id}`}>
                                                    <div
                                                        className={`rounded-lg p-2 sm:p-3 max-w-xs sm:max-w-md lg:max-w-lg text-sm break-words ${
                                                            isOwn
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground"
                                                        }`}>
                                                        {"title" in msg &&
                                                            msg.title && (
                                                                <p className="font-semibold text-sm mb-1">
                                                                    {msg.title}
                                                                </p>
                                                            )}
                                                        <p className="break-words whitespace-pre-wrap">
                                                            {msg.message}
                                                        </p>
                                                        <p
                                                            className={`text-xs mt-2 ${
                                                                isOwn
                                                                    ? "text-primary-foreground/70"
                                                                    : "text-muted-foreground/70"
                                                            }`}>
                                                            {format(
                                                                new Date(
                                                                    msg.createdAt
                                                                ),
                                                                "HH:mm"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Message Input - Fixed */}
                            <div className="flex-shrink-0 border-t border-border px-3 sm:px-4 lg:px-5 pt-2 sm:pt-3 pb-0 bg-background">
                                <div className="flex gap-2 items-center flex-nowrap">
                                    <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl px-3 py-2 shadow-sm">
                                        <TextareaComponent
                                            placeholder="Type a message"
                                            value={messageInput}
                                            onChange={(e) =>
                                                setMessageInput(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    !e.shiftKey
                                                ) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            disabled={
                                                sendPrivateMessageMutation.isPending ||
                                                sendGroupMessageMutation.isPending
                                            }
                                            data-testid="input-message"
                                            className="resize-none text-xs sm:text-sm flex-1 bg-transparent border-0 focus-visible:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none min-h-4"
                                            rows={1}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={
                                            !messageInput.trim() ||
                                            sendPrivateMessageMutation.isPending ||
                                            sendGroupMessageMutation.isPending
                                        }
                                        size="icon"
                                        data-testid="button-send-message"
                                        className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-sm hover:shadow-md transition-shadow">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
                        <div className="text-center space-y-4">
                            <MessageSquare className="h-16 w-16 mx-auto opacity-20" />
                            <p className="text-sm">
                                Select a conversation to start messaging
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
