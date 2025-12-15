import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient ,API_BASE_URL} from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RatingDialogProps {
  userId: number;
  userName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

const RATING_OPTIONS = [
  { value: "excellent", label: "Excellent", stars: 5 },
  { value: "very_good", label: "Very Good", stars: 4 },
  { value: "good", label: "Good", stars: 3 },
  { value: "average", label: "Average", stars: 2 },
  { value: "poor", label: "Poor", stars: 1 },
];

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export default function RatingDialog({ userId, userName, trigger, onSuccess }: RatingDialogProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("");
  const [period, setPeriod] = useState("");
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const submitRatingMutation = useMutation({
    mutationFn: async (data: { userId: number; rating: string; period: string; feedback?: string }) => {
      return await apiRequest(`${API_BASE_URL}/api/ratings`, 'POST', data);
    },
    onSuccess: () => {
      // Invalidate all rating-related queries
      queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/ratings`] });
      // Invalidate team assignment queries (for team leader dashboards)
      queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/team-assignments`] });
      // Invalidate messages (since a notification is sent)
      queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/messages`] });
      toast({
        title: "Rating submitted",
        description: `Successfully rated ${userName}`,
      });
      setOpen(false);
      setRating("");
      setPeriod("");
      setFeedback("");
      onSuccess?.();
    },
    onError: (error: any) => {
      // Handle duplicate rating error (409) with user-friendly message
      if (error.message?.includes("already rated")) {
        toast({
          title: "Duplicate Rating",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit rating",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating || !period) {
      toast({
        title: "Validation error",
        description: "Please select a rating and period",
        variant: "destructive",
      });
      return;
    }

    submitRatingMutation.mutate({
      userId,
      rating,
      period,
      feedback: feedback.trim() || undefined,
    });
  };

  const selectedRating = RATING_OPTIONS.find(r => r.value === rating);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Performance Rating *</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger id="rating" data-testid="select-rating">
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < option.stars
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < selectedRating.stars
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span>{selectedRating.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Rating Period *</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period" data-testid="select-period">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Provide constructive feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              data-testid="textarea-feedback"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitRatingMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitRatingMutation.isPending || !rating || !period}
              data-testid="button-submit-rating"
            >
              {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
