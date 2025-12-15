import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Search, ArrowLeft } from "lucide-react";
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
    senderName?: string;
    receiverName?: string;
}

interface User {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
    role: string;
}

interface Conversation {
    id: string;
    type: "admin" | "team_member";
    userId?: number;
    userName: string;
    userRole?: string;
    userPhoto?: string;
    lastMessage: string;
    lastMessageTime?: Date;
}

export default function TeamLeaderMessages() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [messageText, setMessageText] = useState("");
    const [searchText, setSearchText] = useState("");
    const [selectedConversation, setSelectedConversation] =
        useState<Conversation | null>(null);
    const [showConversationList, setShowConversationList] = useState(true);

    // Fetch all messages
    const { data: allMessages = [], isLoading: loadingMessages } = useQuery<
        Message[]
    >({
        queryKey: ["/api/messages"],
        enabled: !!dbUserId,
    });

    // Fetch all users to identify roles
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    // Fetch team members assigned to this team leader
    const { data: teamMembers = [] } = useQuery<User[]>({
        queryKey: [`${API_BASE_URL}/api/team-assignments/${dbUserId}/members`],
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
        mutationFn: async (data: {
            receiverId: number;
            message: string;
            messageType?: string;
        }) => {
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

    // Get admin messages (from admin to team leader)
    const adminMessages = useMemo(() => {
        return allMessages
            .filter(
                (msg) =>
                    (msg.receiverId === dbUserId &&
                        msg.messageType === "admin_to_team_leader") ||
                    (msg.senderId === dbUserId &&
                        msg.messageType === "team_leader_to_admin")
            )
            .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            );
    }, [allMessages, dbUserId]);

    // Get team member messages
    const teamMemberMessages = useMemo(() => {
        const memberIds = teamMembers.map((m) => m.id);
        return allMessages
            .filter(
                (msg) =>
                    memberIds.includes(msg.senderId) ||
                    memberIds.includes(msg.receiverId)
            )
            .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            );
    }, [allMessages, teamMembers]);

    // Build conversation list
    const conversations: Conversation[] = useMemo(() => {
        const convs: Conversation[] = [];

        // Add admin section if there are admin messages
        if (adminMessages.length > 0) {
            const lastAdmin = adminMessages[adminMessages.length - 1];
            const senderOrReceiver =
                lastAdmin.senderId === dbUserId
                    ? lastAdmin.receiverId
                    : lastAdmin.senderId;
            const adminUser = users.find(
                (u) =>
                    u.id === senderOrReceiver &&
                    (u.role === "company_admin" || u.role === "super_admin")
            );

            convs.push({
                id: "admin-all",
                type: "admin",
                userId: adminUser?.id,
                userName: adminUser?.displayName || "Administrator",
                userRole:
                    adminUser?.role === "company_admin"
                        ? "Admin"
                        : "Super Admin",
                userPhoto: adminUser?.photoURL,
                lastMessage: lastAdmin.message,
                lastMessageTime: new Date(lastAdmin.createdAt),
            });
        }

        // Add team member conversations
        const memberConvMap = new Map<number, Conversation>();
        teamMemberMessages.forEach((msg) => {
            const otherUserId =
                msg.senderId === dbUserId ? msg.receiverId : msg.senderId;
            const otherUser = teamMembers.find((tm) => tm.id === otherUserId);

            if (otherUser && !memberConvMap.has(otherUserId)) {
                memberConvMap.set(otherUserId, {
                    id: `team-member-${otherUserId}`,
                    type: "team_member",
                    userId: otherUserId,
                    userName: otherUser.displayName,
                    userPhoto: otherUser.photoURL,
                    lastMessage: msg.message,
                    lastMessageTime: new Date(msg.createdAt),
                });
            } else if (otherUser && memberConvMap.has(otherUserId)) {
                const existing = memberConvMap.get(otherUserId)!;
                const msgTime = new Date(msg.createdAt).getTime();
                const existingTime = existing.lastMessageTime?.getTime() || 0;
                if (msgTime > existingTime) {
                    memberConvMap.set(otherUserId, {
                        ...existing,
                        lastMessage: msg.message,
                        lastMessageTime: new Date(msg.createdAt),
                    });
                }
            }
        });

        convs.push(
            ...Array.from(memberConvMap.values()).sort(
                (a, b) =>
                    (b.lastMessageTime?.getTime() || 0) -
                    (a.lastMessageTime?.getTime() || 0)
            )
        );

        return convs;
    }, [adminMessages, teamMemberMessages, teamMembers, users, dbUserId]);

    const filteredConversations = conversations.filter(
        (conv) =>
            conv.userName.toLowerCase().includes(searchText.toLowerCase()) ||
            conv.lastMessage.toLowerCase().includes(searchText.toLowerCase())
    );

    const getConversationMessages = () => {
        if (!selectedConversation) return [];

        if (selectedConversation.type === "admin") {
            return adminMessages;
        } else if (selectedConversation.userId) {
            return teamMemberMessages.filter(
                (msg) =>
                    (msg.senderId === selectedConversation.userId &&
                        msg.receiverId === dbUserId) ||
                    (msg.senderId === dbUserId &&
                        msg.receiverId === selectedConversation.userId)
            );
        }
        return [];
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedConversation) return;

        let receiverId: number | null = null;

        if (
            selectedConversation.type === "admin" &&
            selectedConversation.userId
        ) {
            receiverId = selectedConversation.userId;
        } else if (
            selectedConversation.type === "team_member" &&
            selectedConversation.userId
        ) {
            receiverId = selectedConversation.userId;
        }

        if (receiverId) {
            sendMessageMutation.mutate({
                receiverId,
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

    if (loadingMessages) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-[80vh] md:h-[90vh] w-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row gap-0 bg-background overflow-hidden min-w-0 w-full">
                {/* LEFT SIDEBAR - Conversations List */}
                <div
                    className={`${
                        showConversationList ? "flex" : "hidden"
                    } md:flex w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border flex-col min-h-0`}>
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
                                            <div className="flex items-center gap-1">
                                                <p className="font-medium text-sm truncate">
                                                    {conv.userName}
                                                </p>
                                                {conv.userRole && (
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        ({conv.userRole})
                                                    </span>
                                                )}
                                            </div>
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
                            <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-5 py-0 sm:py-1 space-y-0 sm:space-y-1 hide-scrollbar">
                                {conversationMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <p className="text-sm">
                                            No messages yet. Start a
                                            conversation!
                                        </p>
                                    </div>
                                ) : (
                                    conversationMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${
                                                msg.senderId === dbUserId
                                                    ? "justify-end"
                                                    : "justify-start"
                                            }`}
                                            data-testid={`message-${msg.id}`}>
                                            <div
                                                className={`rounded-lg p-2 sm:p-3 max-w-xs sm:max-w-md lg:max-w-lg text-sm break-words ${
                                                    msg.senderId === dbUserId
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted"
                                                }`}>
                                                <p className="break-words whitespace-pre-wrap">
                                                    {msg.message}
                                                </p>
                                                <p
                                                    className={`text-xs mt-2 ${
                                                        msg.senderId ===
                                                        dbUserId
                                                            ? "text-primary-foreground/70"
                                                            : "text-muted-foreground"
                                                    }`}>
                                                    {format(
                                                        new Date(msg.createdAt),
                                                        "HH:mm"
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input - Fixed */}
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
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Select a conversation to start messaging
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
