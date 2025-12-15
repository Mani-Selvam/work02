import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@shared/schema";
import {
    Plus,
    Users as UsersIcon,
    Copy,
    CheckCircle,
    Users2,
    Search,
    MoreVertical,
    Eye,
    Ban,
    CheckCircle2,
    UserCircle,
    Crown,
} from "lucide-react";
import { useLocation } from "wouter";

interface CompanyData {
    id: number;
    name: string;
    maxAdmins: number;
    maxMembers: number;
    currentAdmins: number;
    currentMembers: number;
    isActive: boolean;
}

export default function Users() {
    const { toast } = useToast();
    const { dbUserId, companyId, userRole } = useAuth();
    const [, setLocation] = useLocation();
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
    const [teamAssignmentDialogOpen, setTeamAssignmentDialogOpen] =
        useState(false);
    const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
    const [selectedTeamLeader, setSelectedTeamLeader] = useState<User | null>(
        null
    );
    const [selectedUserForDetails, setSelectedUserForDetails] =
        useState<User | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(
        new Set()
    );
    const [createdUserCredentials, setCreatedUserCredentials] = useState<{
        email: string;
        password: string;
        uniqueUserId: string;
        displayName: string;
    } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [userForm, setUserForm] = useState({
        email: "",
        displayName: "",
        password: "",
        role: "company_member",
    });

    const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ["/api/users?includeDeleted=true"],
    });

    const { data: company } = useQuery<CompanyData>({
        queryKey: ["/api/my-company"],
        enabled: !!companyId && !!dbUserId && userRole === "company_admin",
    });

    // Fetch all team assignments to show counts on team leader cards
    const { data: allTeamAssignments = [] } = useQuery<
        Array<{ teamLeaderId: number; memberId: number }>
    >({
        queryKey: ["/api/team-assignments"],
        enabled: userRole === "company_admin",
    });

    const activeUsers = allUsers.filter((u) => u.isActive !== false);
    const suspendedUsers = allUsers.filter((u) => u.isActive === false);

    const adminSlots = company
        ? {
              current: company.currentAdmins,
              max: company.maxAdmins,
              available: company.maxAdmins - company.currentAdmins,
          }
        : null;
    const memberSlots = company
        ? {
              current: company.currentMembers,
              max: company.maxMembers,
              available: company.maxMembers - company.currentMembers,
          }
        : null;

    const toggleUserStatusMutation = useMutation({
        mutationFn: async ({
            userId,
            isActive,
        }: {
            userId: number;
            isActive: boolean;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/users/${userId}/status`,
                "PATCH",
                { isActive }
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["/api/users?includeDeleted=true"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company"],
            });
            toast({
                title: `User ${
                    variables.isActive ? "activated" : "suspended"
                } successfully`,
                description: `The user has been ${
                    variables.isActive ? "activated" : "suspended"
                }.`,
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update user status",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const createUserMutation = useMutation({
        mutationFn: async (userData: typeof userForm) => {
            const response = await apiRequest(
                `${API_BASE_URL}/api/users`,
                "POST",
                userData
            );
            return (await response.json()) as User;
        },
        onSuccess: (data: User) => {
            setCreatedUserCredentials({
                email: data.email,
                password: userForm.password,
                uniqueUserId: data.uniqueUserId,
                displayName: data.displayName,
            });
            setUserForm({
                email: "",
                displayName: "",
                password: "",
                role: "company_member",
            });
            setAddUserDialogOpen(false);
            setCredentialsDialogOpen(true);
            queryClient.invalidateQueries({
                queryKey: ["/api/users?includeDeleted=true"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company"],
            });

            // If team leader was created, open team assignment dialog
            if (data.role === "team_leader") {
                setSelectedTeamLeader(data);
                setTimeout(() => {
                    setCredentialsDialogOpen(false);
                    setTeamAssignmentDialogOpen(true);
                }, 2000);
            }
        },
        onError: (error: any) => {
            toast({
                title: "Failed to add user",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    // Lazy-load team assignments when dialog opens
    const { data: teamAssignments = [], isLoading: teamAssignmentsLoading } =
        useQuery<User[]>({
            queryKey: [
                "/api/team-assignments",
                selectedTeamLeader?.id,
                "members",
            ],
            queryFn: async () => {
                if (!selectedTeamLeader) return [];
                const response = await fetch(
                    `${API_BASE_URL}/api/team-assignments/${selectedTeamLeader.id}/members`
                );
                if (!response.ok)
                    throw new Error("Failed to fetch team assignments");
                return response.json();
            },
            enabled: !!selectedTeamLeader && teamAssignmentDialogOpen,
        });

    // Mutation to assign team members
    const assignTeamMembersMutation = useMutation({
        mutationFn: async ({
            teamLeaderId,
            memberIds,
        }: {
            teamLeaderId: number;
            memberIds: number[];
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/team-assignments`,
                "POST",
                { teamLeaderId, memberIds }
            );
        },
        onSuccess: () => {
            toast({
                title: "Team members assigned successfully",
            });
            setSelectedMemberIds(new Set());
            queryClient.invalidateQueries({
                queryKey: [
                    "/api/team-assignments",
                    selectedTeamLeader?.id,
                    "members",
                ],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/team-assignments"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/users?includeDeleted=true"],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to assign team members",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation to remove team member
    const removeTeamMemberMutation = useMutation({
        mutationFn: async ({
            teamLeaderId,
            memberId,
        }: {
            teamLeaderId: number;
            memberId: number;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/team-assignments/${teamLeaderId}/members/${memberId}`,
                "DELETE"
            );
        },
        onSuccess: () => {
            toast({
                title: "Team member removed successfully",
            });
            queryClient.invalidateQueries({
                queryKey: [
                    "/api/team-assignments",
                    selectedTeamLeader?.id,
                    "members",
                ],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/team-assignments"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/users?includeDeleted=true"],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to remove team member",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const promoteToTeamLeaderMutation = useMutation({
        mutationFn: async ({ userId }: { userId: number }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/users/${userId}/role`,
                "PATCH",
                { role: "team_leader" }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users?includeDeleted=true"] });
            queryClient.invalidateQueries({ queryKey: ["/api/my-company"] });
            toast({
                title: "User promoted successfully",
                description: "The user has been promoted to Team Leader.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to promote user",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const copyToClipboard = async (text: string, field: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for HTTP / cPanel
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }

            setCopiedField(field);
            toast({
                title: "Copied to clipboard",
                description: `${field} has been copied`,
            });

            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            toast({
                title: "Failed to copy",
                description: "Please copy manually",
                variant: "destructive",
            });
        }
    };

    const canAddAdmin = !adminSlots || adminSlots.available > 0;
    const canAddMember = !memberSlots || memberSlots.available > 0;

    // Get all allocated member IDs across all team leaders
    const allAllocatedMemberIds = useMemo(() => {
        return new Set(allTeamAssignments.map((ta) => ta.memberId));
    }, [allTeamAssignments]);

    // Memoized list of assignable company members (excludes admins, team leaders, and already allocated members)
    const assignableMembers = useMemo(() => {
        return activeUsers.filter(
            (u) =>
                u.role === "company_member" && !allAllocatedMemberIds.has(u.id)
        );
    }, [activeUsers, allAllocatedMemberIds]);

    // Memoized filtered list based on search query
    const filteredAssignableMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return assignableMembers;
        const query = memberSearchQuery.toLowerCase();
        return assignableMembers.filter(
            (m) =>
                m.displayName.toLowerCase().includes(query) ||
                m.email.toLowerCase().includes(query)
        );
    }, [assignableMembers, memberSearchQuery]);

    // Set of currently assigned member IDs for quick lookup
    const assignedMemberIds = useMemo(() => {
        return new Set(teamAssignments.map((m) => m.id));
    }, [teamAssignments]);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">
                        User Management
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        Manage users and their roles
                    </p>
                </div>
                {userRole === "company_admin" && (
                    <Button
                        onClick={() => setAddUserDialogOpen(true)}
                        data-testid="button-add-user">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                )}
            </div>

            {/* Slot Availability (for company admins) */}
            {company && userRole === "company_admin" && (
                <Card data-testid="card-slot-availability">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <UsersIcon className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Admin Slots
                                    </p>
                                    <p
                                        className="text-lg font-semibold"
                                        data-testid="text-admin-slots-available">
                                        {adminSlots?.available} /{" "}
                                        {adminSlots?.max} available
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Member Slots
                                    </p>
                                    <p
                                        className="text-lg font-semibold"
                                        data-testid="text-member-slots-available">
                                        {memberSlots?.available} /{" "}
                                        {memberSlots?.max} available
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                        Active Users ({activeUsers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {usersLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : activeUsers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {activeUsers.map((user) => (
                                <Card
                                    key={user.id}
                                    data-testid={`card-user-${user.id}`}
                                    className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-12 w-12 ring-2 ring-background">
                                                <AvatarImage
                                                    src={user.photoURL || ""}
                                                />
                                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                    {user.displayName
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <h4 className="font-semibold text-base truncate">
                                                    {user.displayName}
                                                </h4>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {user.email}
                                                </p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant={
                                                            user.role ===
                                                                "company_admin" ||
                                                            user.role ===
                                                                "team_leader"
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                        className="text-xs mt-1">
                                                        {user.role.replace(
                                                            "_",
                                                            " "
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {user.role !== "company_admin" && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            data-testid={`button-user-menu-${user.id}`}>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {user.role ===
                                                            "team_leader" && (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setLocation(
                                                                            `/admin/team-members/${user.id}`
                                                                        );
                                                                    }}
                                                                    data-testid={`menu-view-team-members-${user.id}`}>
                                                                    <Users2 className="h-4 w-4 mr-2" />
                                                                    View Team
                                                                    Members
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setSelectedUserForDetails(
                                                                            user
                                                                        );
                                                                        setUserDetailsDialogOpen(
                                                                            true
                                                                        );
                                                                    }}
                                                                    data-testid={`menu-view-details-${user.id}`}>
                                                                    <UserCircle className="h-4 w-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}
                                                        {user.role ===
                                                            "company_member" && (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setSelectedUserForDetails(
                                                                            user
                                                                        );
                                                                        setUserDetailsDialogOpen(
                                                                            true
                                                                        );
                                                                    }}
                                                                    data-testid={`menu-view-details-${user.id}`}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => promoteToTeamLeaderMutation.mutate({ userId: user.id })}
                                                                    disabled={promoteToTeamLeaderMutation.isPending}
                                                                    data-testid={`menu-promote-${user.id}`}>
                                                                    <Crown className="h-4 w-4 mr-2" />
                                                                    Promote to Team Leader
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                toggleUserStatusMutation.mutate(
                                                                    {
                                                                        userId: user.id,
                                                                        isActive:
                                                                            false,
                                                                    }
                                                                )
                                                            }
                                                            disabled={
                                                                toggleUserStatusMutation.isPending
                                                            }
                                                            data-testid={`menu-suspend-user-${user.id}`}>
                                                            <Ban className="h-4 w-4 mr-2" />
                                                            Suspend
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        {user.role === "team_leader" && (
                                            <div className="space-y-2 mt-4 pt-3 border-t">
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">
                                                        Team Members
                                                    </p>
                                                    <p
                                                        className="text-lg font-bold"
                                                        data-testid={`text-member-count-${user.id}`}>
                                                        {
                                                            allTeamAssignments.filter(
                                                                (ta) =>
                                                                    ta.teamLeaderId ===
                                                                    user.id
                                                            ).length
                                                        }
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-xs h-8"
                                                    data-testid={`button-manage-team-${user.id}`}
                                                    onClick={() => {
                                                        setSelectedTeamLeader(
                                                            user
                                                        );
                                                        setTeamAssignmentDialogOpen(
                                                            true
                                                        );
                                                    }}>
                                                    <Users2 className="h-3 w-3 mr-1" />
                                                    Manage Team
                                                </Button>
                                            </div>
                                        )}
                                        {user.role === "company_member" && (
                                            <div className="flex gap-2 mt-4 pt-3 border-t">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8"
                                                    data-testid={`button-suspend-user-${user.id}`}
                                                    onClick={() =>
                                                        toggleUserStatusMutation.mutate(
                                                            {
                                                                userId: user.id,
                                                                isActive: false,
                                                            }
                                                        )
                                                    }
                                                    disabled={
                                                        toggleUserStatusMutation.isPending
                                                    }>
                                                    {toggleUserStatusMutation.isPending
                                                        ? "..."
                                                        : "Suspend"}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No active users found
                        </div>
                    )}
                </CardContent>
            </Card>

            {suspendedUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">
                            Suspended Users ({suspendedUsers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {suspendedUsers.map((user) => (
                                <Card
                                    key={user.id}
                                    className="opacity-60"
                                    data-testid={`card-suspended-user-${user.id}`}>
                                    <CardContent className="p-3 sm:p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                                                <AvatarImage
                                                    src={user.photoURL || ""}
                                                />
                                                <AvatarFallback className="bg-muted text-muted-foreground text-xs sm:text-sm">
                                                    {user.displayName
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm sm:text-base truncate">
                                                    {user.displayName}
                                                </h4>
                                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge
                                                variant="outline"
                                                className="text-xs">
                                                Suspended
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                data-testid={`button-activate-user-${user.id}`}
                                                onClick={() =>
                                                    toggleUserStatusMutation.mutate(
                                                        {
                                                            userId: user.id,
                                                            isActive: true,
                                                        }
                                                    )
                                                }
                                                disabled={
                                                    toggleUserStatusMutation.isPending
                                                }>
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Activate
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={addUserDialogOpen}
                onOpenChange={setAddUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Create a new user account for your company
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="user-email">Email</Label>
                            <Input
                                id="user-email"
                                type="email"
                                placeholder="user@example.com"
                                value={userForm.email}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        email: e.target.value,
                                    })
                                }
                                data-testid="input-user-email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user-displayname">
                                Display Name
                            </Label>
                            <Input
                                id="user-displayname"
                                placeholder="John Doe"
                                value={userForm.displayName}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        displayName: e.target.value,
                                    })
                                }
                                data-testid="input-user-displayname"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user-password">Password</Label>
                            <Input
                                id="user-password"
                                type="password"
                                placeholder="********"
                                value={userForm.password}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        password: e.target.value,
                                    })
                                }
                                data-testid="input-user-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user-role">Role</Label>
                            <Select
                                value={userForm.role}
                                onValueChange={(value) =>
                                    setUserForm({ ...userForm, role: value })
                                }>
                                <SelectTrigger
                                    id="user-role"
                                    data-testid="select-user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="company_admin"
                                        disabled={!canAddAdmin}>
                                        Admin{" "}
                                        {!canAddAdmin &&
                                            `(${adminSlots?.available}/${adminSlots?.max} slots)`}
                                    </SelectItem>
                                    <SelectItem
                                        value="team_leader"
                                        disabled={!canAddMember}>
                                        Team Leader{" "}
                                        {!canAddMember &&
                                            `(${memberSlots?.available}/${memberSlots?.max} slots)`}
                                    </SelectItem>
                                    <SelectItem
                                        value="company_member"
                                        disabled={!canAddMember}>
                                        Member{" "}
                                        {!canAddMember &&
                                            `(${memberSlots?.available}/${memberSlots?.max} slots)`}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(!canAddAdmin || !canAddMember) && (
                            <p
                                className="text-sm text-amber-600"
                                data-testid="text-slot-warning">
                                {!canAddAdmin && "Admin slots are full. "}
                                {!canAddMember && "Member slots are full. "}
                                Upgrade your plan to add more users.
                            </p>
                        )}
                        <Button
                            onClick={() => createUserMutation.mutate(userForm)}
                            disabled={
                                !userForm.email ||
                                !userForm.displayName ||
                                !userForm.password ||
                                createUserMutation.isPending ||
                                (userForm.role === "company_admin" &&
                                    !canAddAdmin) ||
                                (userForm.role === "team_leader" &&
                                    !canAddMember) ||
                                (userForm.role === "company_member" &&
                                    !canAddMember)
                            }
                            data-testid="button-submit-add-user"
                            className="w-full">
                            {createUserMutation.isPending
                                ? "Adding..."
                                : "Add User"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={credentialsDialogOpen}
                onOpenChange={setCredentialsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            User Created Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Share these credentials with the user so they can
                            log in. They will need all three pieces of
                            information.
                        </DialogDescription>
                    </DialogHeader>

                    {createdUserCredentials && (
                        <div className="space-y-4">
                            <Alert data-testid="alert-user-credentials">
                                <AlertDescription className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2">
                                            Login Instructions for User:
                                        </p>
                                        <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                                            <li>
                                                Go to the login page and select
                                                "Company User" tab
                                            </li>
                                            <li>
                                                Enter the Username, User ID, and
                                                Password provided below
                                            </li>
                                            <li>
                                                Click "Login" to access the
                                                company dashboard
                                            </li>
                                        </ol>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                                <div className="bg-muted p-4 rounded-lg space-y-1">
                                    <Label className="text-sm text-muted-foreground">
                                        Username (Display Name)
                                    </Label>
                                    <div className="flex items-center justify-between gap-2">
                                        <p
                                            className="font-mono font-semibold"
                                            data-testid="text-created-username">
                                            {createdUserCredentials.displayName}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    createdUserCredentials.displayName,
                                                    "Username"
                                                )
                                            }
                                            data-testid="button-copy-username">
                                            {copiedField === "Username" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted p-4 rounded-lg space-y-1">
                                    <Label className="text-sm text-muted-foreground">
                                        User ID (Required for Login)
                                    </Label>
                                    <div className="flex items-center justify-between gap-2">
                                        <p
                                            className="font-mono font-semibold"
                                            data-testid="text-created-userid">
                                            {
                                                createdUserCredentials.uniqueUserId
                                            }
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    createdUserCredentials.uniqueUserId,
                                                    "User ID"
                                                )
                                            }
                                            data-testid="button-copy-userid">
                                            {copiedField === "User ID" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted p-4 rounded-lg space-y-1">
                                    <Label className="text-sm text-muted-foreground">
                                        Email
                                    </Label>
                                    <div className="flex items-center justify-between gap-2">
                                        <p
                                            className="font-mono font-semibold"
                                            data-testid="text-created-email">
                                            {createdUserCredentials.email}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    createdUserCredentials.email,
                                                    "Email"
                                                )
                                            }
                                            data-testid="button-copy-email">
                                            {copiedField === "Email" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted p-4 rounded-lg space-y-1">
                                    <Label className="text-sm text-muted-foreground">
                                        Password (Set by Admin)
                                    </Label>
                                    <div className="flex items-center justify-between gap-2">
                                        <p
                                            className="font-mono font-semibold"
                                            data-testid="text-created-password">
                                            {createdUserCredentials.password}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    createdUserCredentials.password,
                                                    "Password"
                                                )
                                            }
                                            data-testid="button-copy-password">
                                            {copiedField === "Password" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Alert
                                variant="default"
                                className="border-amber-200 bg-amber-50">
                                <AlertDescription className="text-sm text-amber-800">
                                    ⚠️ Important: Save these credentials now.
                                    The password will not be shown again for
                                    security reasons.
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={() => {
                                    setCredentialsDialogOpen(false);
                                    setCreatedUserCredentials(null);
                                }}
                                className="w-full"
                                data-testid="button-close-credentials">
                                I've Saved the Credentials
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Team Assignment Dialog */}
            <Dialog
                open={teamAssignmentDialogOpen}
                onOpenChange={setTeamAssignmentDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users2 className="h-5 w-5" />
                            Manage Team for {selectedTeamLeader?.displayName}
                        </DialogTitle>
                        <DialogDescription>
                            Assign team members to this team leader. Only
                            company members can be assigned to a team.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Currently Assigned Members */}
                        {teamAssignments.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Currently Assigned Members
                                </Label>
                                <div className="space-y-2">
                                    {teamAssignments.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-3 bg-muted rounded-md"
                                            data-testid={`assigned-member-${member.id}`}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={
                                                            member.photoURL ||
                                                            ""
                                                        }
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {member.displayName
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {member.displayName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    if (selectedTeamLeader) {
                                                        removeTeamMemberMutation.mutate(
                                                            {
                                                                teamLeaderId:
                                                                    selectedTeamLeader.id,
                                                                memberId:
                                                                    member.id,
                                                            }
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    removeTeamMemberMutation.isPending
                                                }
                                                data-testid={`button-remove-member-${member.id}`}>
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Members */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Add Team Members
                            </Label>

                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search members by name or email..."
                                    value={memberSearchQuery}
                                    onChange={(e) =>
                                        setMemberSearchQuery(e.target.value)
                                    }
                                    className="pl-9"
                                    data-testid="input-search-members"
                                />
                            </div>

                            {/* Member List */}
                            {teamAssignmentsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : filteredAssignableMembers.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                    {filteredAssignableMembers.map((member) => {
                                        const isAssigned =
                                            assignedMemberIds.has(member.id);
                                        const isSelected =
                                            selectedMemberIds.has(member.id);

                                        return (
                                            <div
                                                key={member.id}
                                                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                                    isAssigned
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : "hover:bg-muted cursor-pointer"
                                                }`}
                                                onClick={() => {
                                                    if (!isAssigned) {
                                                        const newSet = new Set(
                                                            selectedMemberIds
                                                        );
                                                        if (isSelected) {
                                                            newSet.delete(
                                                                member.id
                                                            );
                                                        } else {
                                                            newSet.add(
                                                                member.id
                                                            );
                                                        }
                                                        setSelectedMemberIds(
                                                            newSet
                                                        );
                                                    }
                                                }}
                                                data-testid={`member-option-${member.id}`}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    disabled={isAssigned}
                                                    data-testid={`checkbox-member-${member.id}`}
                                                />
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={
                                                            member.photoURL ||
                                                            ""
                                                        }
                                                    />
                                                    <AvatarFallback className="text-xs">
                                                        {member.displayName
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {member.displayName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.email}
                                                    </p>
                                                </div>
                                                {isAssigned && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs">
                                                        Already Assigned
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    {memberSearchQuery.trim()
                                        ? "No members match your search"
                                        : "No available members to assign"}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    if (
                                        selectedTeamLeader &&
                                        selectedMemberIds.size > 0
                                    ) {
                                        assignTeamMembersMutation.mutate({
                                            teamLeaderId: selectedTeamLeader.id,
                                            memberIds:
                                                Array.from(selectedMemberIds),
                                        });
                                    }
                                }}
                                disabled={
                                    !selectedTeamLeader ||
                                    selectedMemberIds.size === 0 ||
                                    assignTeamMembersMutation.isPending
                                }
                                className="flex-1"
                                data-testid="button-assign-members">
                                {assignTeamMembersMutation.isPending
                                    ? "Assigning..."
                                    : `Assign Selected (${selectedMemberIds.size})`}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setTeamAssignmentDialogOpen(false);
                                    setSelectedTeamLeader(null);
                                    setSelectedMemberIds(new Set());
                                    setMemberSearchQuery("");
                                }}
                                data-testid="button-close-team-dialog">
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* User Details Dialog */}
            <Dialog
                open={userDetailsDialogOpen}
                onOpenChange={setUserDetailsDialogOpen}>
                <DialogContent className="max-w-md select-none">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                        <DialogDescription>
                            View user information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUserForDetails && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 pb-4 border-b">
                                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                                    <AvatarImage
                                        src={
                                            selectedUserForDetails.photoURL ||
                                            ""
                                        }
                                    />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                                        {selectedUserForDetails.displayName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {selectedUserForDetails.displayName}
                                    </h3>
                                    <Badge
                                        variant={
                                            selectedUserForDetails.role ===
                                                "company_admin" ||
                                            selectedUserForDetails.role ===
                                                "team_leader"
                                                ? "default"
                                                : "secondary"
                                        }>
                                        {selectedUserForDetails.role.replace(
                                            "_",
                                            " "
                                        )}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Email
                                    </Label>
                                    <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                                        <p
                                            className="text-sm font-mono"
                                            data-testid="text-detail-email">
                                            {selectedUserForDetails.email}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    selectedUserForDetails.email,
                                                    "Email"
                                                )
                                            }
                                            className="h-7">
                                            {copiedField === "Email" ? (
                                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        User ID
                                    </Label>
                                    <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                                        <p
                                            className="text-sm font-mono"
                                            data-testid="text-detail-userid">
                                            {
                                                selectedUserForDetails.uniqueUserId
                                            }
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    selectedUserForDetails.uniqueUserId,
                                                    "User ID"
                                                )
                                            }
                                            className="h-7">
                                            {copiedField === "User ID" ? (
                                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        Username
                                    </Label>
                                    <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                                        <p
                                            className="text-sm font-mono"
                                            data-testid="text-detail-username">
                                            {selectedUserForDetails.displayName}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copyToClipboard(
                                                    selectedUserForDetails.displayName,
                                                    "Username"
                                                )
                                            }
                                            className="h-7">
                                            {copiedField === "Username" ? (
                                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                                    <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                                        <strong>Security Note:</strong>{" "}
                                        Passwords are encrypted and cannot be
                                        displayed for security reasons. Users
                                        must use the password set during account
                                        creation.
                                    </AlertDescription>
                                </Alert>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setUserDetailsDialogOpen(false);
                                        setSelectedUserForDetails(null);
                                    }}
                                    className="flex-1"
                                    data-testid="button-close-details">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
