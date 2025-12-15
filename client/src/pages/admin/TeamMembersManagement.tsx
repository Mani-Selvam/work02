import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Search,
    UserMinus,
    Mail,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState } from "react";
import type { User } from "@shared/schema";

interface TeamMembersManagementProps {
    params: {
        teamLeaderId: string;
    };
}

export default function TeamMembersManagement({
    params,
}: TeamMembersManagementProps) {
    const { toast } = useToast();
    const { userRole } = useAuth();
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const teamLeaderId = parseInt(params.teamLeaderId);

    const { data: teamLeader, isLoading: loadingLeader } = useQuery<User>({
        queryKey: ["/api/users", teamLeaderId.toString()],
        enabled: !!teamLeaderId && userRole === "company_admin",
    });

    const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<
        User[]
    >({
        queryKey: ["/api/team-assignments", teamLeaderId.toString(), "members"],
        enabled: !!teamLeaderId && userRole === "company_admin",
    });

    const removeTeamMemberMutation = useMutation({
        mutationFn: async (memberId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/team-assignments/${teamLeaderId}/members/${memberId}`,
                "DELETE"
            );
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description:
                    "Team member removed successfully. They are now unallocated.",
            });
            queryClient.invalidateQueries({
                queryKey: [
                    "/api/team-assignments",
                    teamLeaderId.toString(),
                    "members",
                ],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/team-assignments"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/users"],
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to remove team member",
                variant: "destructive",
            });
        },
    });

    const filteredMembers = teamMembers.filter(
        (member) =>
            member.displayName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.uniqueUserId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (userRole !== "company_admin") {
        return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Access denied. Only company admins can manage team
                        members.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (loadingLeader || loadingMembers) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" disabled>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="animate-pulse">
                        <div className="h-8 w-48 bg-muted rounded mb-2"></div>
                        <div className="h-4 w-96 bg-muted rounded"></div>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!teamLeader) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocation("/admin/users")}
                        data-testid="button-back">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Team Not Found</h1>
                    </div>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Team leader not found or you don't have permission to
                        view this team.
                    </AlertDescription>
                </Alert>
                <Button onClick={() => setLocation("/admin/users")}>
                    Back to Users
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/admin/users")}
                    data-testid="button-back">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">Team Members</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">Team Leader:</p>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={teamLeader.photoURL || ""} />
                                <AvatarFallback className="text-xs">
                                    {getInitials(teamLeader.displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                                {teamLeader.displayName}
                            </span>
                            <Badge variant="default" className="text-xs">
                                Team Leader
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-members"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {teamMembers.length}{" "}
                    {teamMembers.length === 1 ? "member" : "members"}
                </div>
            </div>

            {filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                        <Card
                            key={member.id}
                            data-testid={`card-member-${member.id}`}
                            className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12 ring-2 ring-background">
                                        <AvatarImage
                                            src={member.photoURL || ""}
                                        />
                                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                            {getInitials(member.displayName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">
                                            {member.displayName}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {member.email}
                                        </p>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs mt-1">
                                            {member.uniqueUserId}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">
                                        {member.email}
                                    </span>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() =>
                                        removeTeamMemberMutation.mutate(
                                            member.id
                                        )
                                    }
                                    disabled={
                                        removeTeamMemberMutation.isPending
                                    }
                                    data-testid={`button-remove-member-${member.id}`}>
                                    {removeTeamMemberMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <UserMinus className="h-3 w-3 mr-2" />
                                            Remove Member
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {searchTerm ? (
                            <>
                                <Search className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">
                                    No members match your search
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setSearchTerm("")}>
                                    Clear Search
                                </Button>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">
                                    No team members assigned yet
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Go back to Users page to assign members to
                                    this team
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setLocation("/admin/users")}>
                                    Manage Users
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {teamMembers.length > 0 && (
                <Alert>
                    <AlertDescription className="text-sm">
                        <strong>Note:</strong> When you remove a member from
                        this team, they become unallocated and will appear in
                        the "Allocate Members" list for other team leaders.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
