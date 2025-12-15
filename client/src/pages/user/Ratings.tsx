import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import RatingBadge from "@/components/RatingBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Rating } from "@shared/schema";
import { API_BASE_URL } from "@/lib/queryClient";

export default function Ratings() {
    const { dbUserId } = useAuth();

    const { data: ratings = [], isLoading } = useQuery<Rating[]>({
        queryKey: ["/api/ratings", dbUserId],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(
                `${API_BASE_URL}/api/ratings?userId=${dbUserId}`,
                { headers, credentials: "include" }
            );
            if (!res.ok) throw new Error("Failed to fetch ratings");
            return res.json();
        },
        enabled: !!dbUserId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                    Performance Ratings
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Your performance feedback
                </p>
            </div>

            {ratings.length > 0 ? (
                <div className="space-y-4">
                    {ratings.map((rating) => (
                        <Card
                            key={rating.id}
                            data-testid={`card-rating-${rating.id}`}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        <RatingBadge
                                            rating={rating.rating as any}
                                            timestamp={
                                                new Date(rating.createdAt)
                                            }
                                            period={rating.period}
                                        />
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            {rating.feedback && (
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {rating.feedback}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    No ratings yet
                </div>
            )}
        </div>
    );
}
