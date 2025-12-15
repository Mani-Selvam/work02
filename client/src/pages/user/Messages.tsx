import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Mail, Search, ArrowLeft } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { format } from "date-fns";

interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    message: string;
    messageType: string;
    readStatus: boolean;
    createdAt: string;
}

interface TeamLeader {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
}

interface Conversation {
    id: string;
    type: "admin" | "team_leader";
    userId?: number;
    userName: string;
    userRole?: string;
    userPhoto?: string;
    lastMessage: string;
    lastMessageTime?: Date;
}

export default function Messages() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [messageText, setMessageText] = useState("");
    const [searchText, setSearchText] = useState("");
    const [selectedConversation, setSelectedConversation] =
        useState<Conversation | null>(null);
    const [showConversationList, setShowConversationList] = useState(true);

    const { data: allMessages = [], isLoading: loadingMessages } = useQuery<
        Message[]
    >({
        queryKey: ["/api/messages"],
        enabled: !!dbUserId,
    });

    const { data: teamLeaderInfo, isLoading: loadingLeader } =
        useQuery<TeamLeader | null>({
            queryKey: ["/api/team-leader/me"],
            queryFn: async () => {
                const res = await fetch(`${API_BASE_URL}/api/team-leader/me`, {
                    credentials: "include",
                    headers: {
                        "x-user-id": dbUserId?.toString() || "",
                    },
                });

                if (res.status === 404) {
                    const body = await res.json().catch(() => ({}));
                    if (body.message === "NOT_ASSIGNED") {
                        return null;
                    }
                    throw new Error("User not found");
                }

                if (!res.ok) {
                    throw new Error("Failed to fetch team leader");
                }

                return res.json();
            },
            enabled: !!dbUserId,
            retry: false,
        });

    useWebSocket((data) => {
        if (data.type === "NEW_MESSAGE") {
            const messageData = data.data;

            if (
                messageData.senderId === dbUserId ||
                messageData.receiverId === dbUserId
            ) {
                queryClient.invalidateQueries({ queryKey: ["/api/messages"] });

                if (messageData.receiverId === dbUserId) {
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
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (data: { receiverId: number; message: string }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/messages`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            setMessageText("");
            toast({
                title: "Success",
                description: "Message sent successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to send message",
                variant: "destructive",
            });
        },
    });

    const adminMessages = useMemo(() => {
        return allMessages
            .filter(
                (msg) =>
                    msg.messageType === "admin_to_employee" &&
                    msg.receiverId === dbUserId
            )
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            );
    }, [allMessages, dbUserId]);

    const teamLeaderMessages = useMemo(() => {
        if (!teamLeaderInfo) return [];
        return allMessages
            .filter(
                (msg) =>
                    ((msg.senderId === teamLeaderInfo.id &&
                        msg.receiverId === dbUserId) ||
                        (msg.senderId === dbUserId &&
                            msg.receiverId === teamLeaderInfo.id)) &&
                    (msg.messageType === "team_leader_to_employee" ||
                        msg.messageType === "employee_to_team_leader")
            )
            .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            );
    }, [teamLeaderInfo, allMessages, dbUserId]);

    const conversations: Conversation[] = useMemo(() => {
        const convs: Conversation[] = [];

        if (adminMessages.length > 0) {
            const lastAdmin = adminMessages[0];
            convs.push({
                id: "admin-all",
                type: "admin",
                userName: "Admin Messages",
                lastMessage: lastAdmin.message,
                lastMessageTime: new Date(lastAdmin.createdAt),
            });
        }

        if (teamLeaderInfo) {
            const lastTeamLeader =
                teamLeaderMessages[teamLeaderMessages.length - 1];
            convs.push({
                id: `team-leader-${teamLeaderInfo.id}`,
                type: "team_leader",
                userId: teamLeaderInfo.id,
                userName: teamLeaderInfo.displayName,
                userRole: "Team Leader",
                userPhoto: teamLeaderInfo.photoURL,
                lastMessage: lastTeamLeader?.message || "Start a conversation",
                lastMessageTime: lastTeamLeader
                    ? new Date(lastTeamLeader.createdAt)
                    : new Date(),
            });
        }

        return convs;
    }, [adminMessages, teamLeaderMessages, teamLeaderInfo]);

    const filteredConversations = conversations.filter((conv) =>
        conv.userName.toLowerCase().includes(searchText.toLowerCase())
    );

    const getConversationMessages = () => {
        if (!selectedConversation) return [];
        if (selectedConversation.type === "admin") return adminMessages;
        return teamLeaderMessages;
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedConversation) return;

        if (selectedConversation.type === "team_leader" && teamLeaderInfo) {
            sendMessageMutation.mutate({
                receiverId: teamLeaderInfo.id,
                message: messageText.trim(),
            });
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const conversationMessages = getConversationMessages();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversationMessages]);

    if (loadingMessages || loadingLeader) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-[80vh] md:h-[90vh] w-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row gap-0 bg-background overflow-hidden min-w-0">
                {/* LEFT SIDEBAR - Conversations List */}
                <div
                    className={`${
                        showConversationList ? "flex" : "hidden"
                    } md:flex w-full md:w-72 border-b md:border-b-0 md:border-r border-border flex-col min-h-0`}>
                    <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border space-y-3">
                        <h3 className="font-semibold text-sm">Messages</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search conversations..."
                                className="pl-9 h-9 text-sm"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                data-testid="input-search-messages"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 p-2 hide-scrollbar">
                        {filteredConversations.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p className="text-sm">No conversations</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => {
                                        setSelectedConversation(conv);
                                        setShowConversationList(false);
                                    }}
                                    className={`w-full p-2 sm:p-3 rounded-lg text-left transition-colors ${
                                        selectedConversation?.id === conv.id
                                            ? "bg-primary/10 border border-primary"
                                            : "hover:bg-accent"
                                    }`}
                                    data-testid={`button-conversation-${conv.id}`}>
                                    <div className="flex items-start gap-2">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage src={conv.userPhoto} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(conv.userName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {conv.userName}
                                            </p>
                                            {conv.userRole && (
                                                <p className="text-xs text-muted-foreground">
                                                    {conv.userRole}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground truncate mt-1">
                                                {conv.lastMessage}
                                            </p>
                                            {conv.lastMessageTime && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {format(
                                                        conv.lastMessageTime,
                                                        "MMM dd, HH:mm"
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE - Chat Area - Full Height */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    {selectedConversation ? (
                        <div className="flex flex-col h-full min-h-0 overflow-hidden">
                            {/* Header - Fixed */}
                            <div className="flex-shrink-0 sticky top-0 z-50 px-3 sm:px-4 lg:px-5 py-2 sm:py-2 border-b border-border flex items-center gap-3 bg-background shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-8 w-8"
                                    onClick={() => {
                                        setShowConversationList(true);
                                        setSelectedConversation(null);
                                    }}
                                    data-testid="button-back-conversations">
                                    <ArrowLeft className="h-3 w-3" />
                                </Button>
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage
                                        src={selectedConversation.userPhoto}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {getInitials(
                                            selectedConversation.userName
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-xs sm:text-sm truncate">
                                        {selectedConversation.userName}
                                    </h3>
                                    {selectedConversation.userRole && (
                                        <p className="text-xs text-muted-foreground leading-tight">
                                            {selectedConversation.userRole}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Messages - Scrollable */}
                            <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-5 py-1 sm:py-2 space-y-1 sm:space-y-2 hide-scrollbar">
                                {conversationMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <p className="text-sm">
                                            No messages yet
                                        </p>
                                    </div>
                                ) : (
                                    conversationMessages.map((msg) => {
                                        const isOwn = msg.senderId === dbUserId;
                                        return (
                                            <div
                                                key={msg.id}
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
                                                            : "bg-muted"
                                                    }`}>
                                                    <p className="break-words whitespace-pre-wrap">
                                                        {msg.message}
                                                    </p>
                                                    <p
                                                        className={`text-xs mt-2 ${
                                                            isOwn
                                                                ? "text-primary-foreground/70"
                                                                : "text-muted-foreground"
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

                            {selectedConversation.type === "team_leader" && (
                                <div className="flex-shrink-0 px-3 sm:px-4 lg:px-5 pt-2 sm:pt-3 pb-0 border-t border-border flex gap-2 items-center bg-background flex-nowrap">
                                    <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl px-3 py-2 shadow-sm">
                                        <Textarea
                                            placeholder="Type a message"
                                            className="resize-none text-xs sm:text-sm flex-1 bg-transparent border-0 focus-visible:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none min-h-4"
                                            rows={1}
                                            value={messageText}
                                            onChange={(e) =>
                                                setMessageText(e.target.value)
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
                                            data-testid="input-message"
                                        />
                                    </div>
                                    <Button
                                        size="icon"
                                        onClick={handleSendMessage}
                                        disabled={
                                            !messageText.trim() ||
                                            sendMessageMutation.isPending
                                        }
                                        data-testid="button-send-message"
                                        className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-sm hover:shadow-md transition-shadow">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Input - Fixed */}
                            {selectedConversation.type === "admin" && (
                                <div className="flex-shrink-0 px-3 sm:px-4 pt-2 pb-0 border-t border-border bg-muted/50 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        Admin messages are read-only
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Select a conversation to start
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
