import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface RatingBadgeProps {
  rating: "Excellent" | "Good" | "Needs Improvement";
  feedback?: string;
  timestamp: Date;
  period: string;
}

const ratingColors = {
  Excellent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Needs Improvement": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function RatingBadge({ rating, feedback, timestamp, period }: RatingBadgeProps) {
  return (
    <Card data-testid={`card-rating-${period.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold">Admin Feedback</p>
            <p className="text-xs text-muted-foreground font-mono">
              {format(timestamp, "MMM dd, yyyy")} • {period}
            </p>
          </div>
          <Badge className={ratingColors[rating]} data-testid={`badge-rating-${period}`}>
            {rating}
          </Badge>
        </div>
      </CardHeader>
      {feedback && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{feedback}</p>
        </CardContent>
      )}
    </Card>
  );
}
