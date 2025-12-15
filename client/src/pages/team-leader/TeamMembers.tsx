import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

interface TeamMember {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
    uniqueUserId: string;
    isActive: boolean;
}

export default function TeamMembers() {
    const { dbUserId } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
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

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <Skeleton className="h-4 w-32 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Team</h1>
                <p className="text-muted-foreground">
                    Manage your assigned team members
                </p>
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
            </div>

            {filteredMembers.length === 0 && !isLoading && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UserX className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-lg font-medium">
                            {searchTerm
                                ? "No matching team members found"
                                : "No team members assigned yet"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            {searchTerm
                                ? "Try a different search term"
                                : "Contact your admin to assign team members"}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                    <Card
                        key={member.id}
                        data-testid={`card-member-${member.id}`}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            {getInitials(member.displayName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <CardTitle className="text-base truncate">
                                            {member.displayName}
                                        </CardTitle>
                                        <CardDescription className="text-xs truncate">
                                            {member.uniqueUserId}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge
                                    variant={
                                        member.isActive
                                            ? "default"
                                            : "secondary"
                                    }>
                                    {member.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{member.email}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
