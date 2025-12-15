import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import RatingDialog from "@/components/RatingDialog";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

interface TeamMember {
    id: number;
    displayName: string;
    email: string;
    photoURL?: string;
    uniqueUserId: string;
}

interface Rating {
    id: number;
    userId: number;
    ratedBy: number;
    rating: string;
    feedback?: string;
    period: string;
    createdAt: string;
}

interface TeamMemberRating {
    member: TeamMember;
    latestRating?: Rating;
}

export default function TeamRatings() {
    const { dbUserId } = useAuth();

    const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<
        TeamMember[]
    >({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
    });

    const { data: allRatings = [], isLoading: loadingRatings } = useQuery<
        Rating[]
    >({
        queryKey: ["/api/ratings"],
        enabled: !!dbUserId,
    });

    const teamMemberRatings: TeamMemberRating[] = teamMembers.map((member) => {
        const memberRatings = allRatings.filter((r) => r.userId === member.id);
        const latestRating = memberRatings.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        )[0];

        return {
            member,
            latestRating,
        };
    });

    const getRatingValue = (ratingStr: string): number => {
        const ratingMap: Record<string, number> = {
            excellent: 5,
            very_good: 4,
            good: 3,
            average: 2,
            poor: 1,
        };
        return ratingMap[ratingStr.toLowerCase()] || 3;
    };

    const getRatingLabel = (ratingStr: string): string => {
        return ratingStr
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${
                            star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                        }`}
                    />
                ))}
            </div>
        );
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (loadingMembers || loadingRatings) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-12 w-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Team Ratings</h1>
                    <p className="text-muted-foreground">
                        Review team member performance ratings
                    </p>
                </div>
            </div>

            {teamMemberRatings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UserX className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground text-center">
                            No team members assigned yet
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {teamMemberRatings.map(({ member, latestRating }) => (
                        <Card
                            key={member.id}
                            data-testid={`card-rating-${member.id}`}>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage
                                                src={member.photoURL}
                                            />
                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                {getInitials(
                                                    member.displayName
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {member.displayName}
                                            </CardTitle>
                                            {latestRating ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    {renderStars(
                                                        getRatingValue(
                                                            latestRating.rating
                                                        )
                                                    )}
                                                    <span className="text-sm font-semibold">
                                                        {getRatingLabel(
                                                            latestRating.rating
                                                        )}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    No ratings yet
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <RatingDialog
                                        userId={member.id}
                                        userName={member.displayName}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                data-testid={`button-rate-${member.id}`}>
                                                <Star className="h-4 w-4 mr-2" />
                                                Rate Member
                                            </Button>
                                        }
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {latestRating ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                                Rating Period
                                            </p>
                                            <p className="text-sm font-medium">
                                                {getRatingLabel(
                                                    latestRating.period
                                                )}
                                            </p>
                                        </div>
                                        {latestRating.feedback && (
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">
                                                    Feedback
                                                </p>
                                                <p className="text-sm">
                                                    {latestRating.feedback}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                                Rated On
                                            </p>
                                            <p className="text-sm">
                                                {new Date(
                                                    latestRating.createdAt
                                                ).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            This team member hasn't been rated
                                            yet
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
