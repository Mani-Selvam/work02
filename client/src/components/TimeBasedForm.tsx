import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sunrise, Moon, Upload, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TimeBasedFormProps {
    type: "morning" | "evening";
    userName: string;
    userId: number | null;
}

export default function TimeBasedForm({
    type,
    userName,
    userId,
}: TimeBasedFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        plannedTasks: "",
        completedTasks: "",
        pendingTasks: "",
        notes: "",
        screenshot: null as File | null,
    });

    const submitReportMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!userId) throw new Error("User ID is required");

            const reportData = {
                userId,
                reportType: type,
                plannedTasks: data.plannedTasks || null,
                completedTasks: data.completedTasks || null,
                pendingTasks: data.pendingTasks || null,
                notes: data.notes || null,
            };

            return await apiRequest(`${API_BASE_URL}/api/reports`, "POST", reportData);
        },
        onSuccess: () => {
            toast({
                title: "Report submitted successfully",
                description: `Your ${type} report has been saved.`,
            });
            setFormData({
                plannedTasks: "",
                completedTasks: "",
                pendingTasks: "",
                notes: "",
                screenshot: null,
            });
            queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/reports`] });
        },
        onError: (error) => {
            toast({
                title: "Failed to submit report",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const isMorning = type === "morning";
    const greeting = isMorning ? "Good Morning" : "Good Evening";
    const Icon = isMorning ? Sunrise : Moon;
    const headerBgClass = isMorning
        ? "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30"
        : "bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30";
    const iconColorClass = isMorning ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitReportMutation.mutate(formData);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, screenshot: e.target.files[0] });
            console.log("File selected:", e.target.files[0].name);
        }
    };

    return (
        <Card className="overflow-hidden border-0 shadow-lg" data-testid={`form-${type}`}>
            <div className={`${headerBgClass} p-4 sm:p-6 border-b`}>
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-background/80 backdrop-blur rounded-xl shadow-md">
                        <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${iconColorClass}`} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                            {greeting} {userName}!
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {isMorning
                                ? "Please enter your planned tasks for today"
                                : "Please enter your completed work for today"}
                        </p>
                    </div>
                </div>
            </div>
            <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {isMorning ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="planned-tasks">
                                    Planned Tasks *
                                </Label>
                                <Textarea
                                    id="planned-tasks"
                                    placeholder="List your tasks for today..."
                                    className="min-h-32 resize-none"
                                    value={formData.plannedTasks}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            plannedTasks: e.target.value,
                                        })
                                    }
                                    data-testid="input-planned-tasks"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes / Comments</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any additional notes..."
                                    className="min-h-24 resize-none"
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            notes: e.target.value,
                                        })
                                    }
                                    data-testid="input-notes"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="completed-tasks">
                                    Completed Tasks *
                                </Label>
                                <Textarea
                                    id="completed-tasks"
                                    placeholder="What did you complete today..."
                                    className="min-h-32 resize-none"
                                    value={formData.completedTasks}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            completedTasks: e.target.value,
                                        })
                                    }
                                    data-testid="input-completed-tasks"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pending-tasks">
                                    Pending Tasks
                                </Label>
                                <Textarea
                                    id="pending-tasks"
                                    placeholder="Tasks that are still pending..."
                                    className="min-h-24 resize-none"
                                    value={formData.pendingTasks}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            pendingTasks: e.target.value,
                                        })
                                    }
                                    data-testid="input-pending-tasks"
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="screenshot" className="text-sm sm:text-base">
                            Screenshot Upload (Optional)
                        </Label>
                        <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center hover-elevate cursor-pointer">
                            <input
                                type="file"
                                id="screenshot"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                data-testid="input-screenshot"
                            />
                            <label
                                htmlFor="screenshot"
                                className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {formData.screenshot
                                        ? formData.screenshot.name
                                        : "Click to upload screenshot"}
                                </p>
                            </label>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        data-testid="button-submit-report"
                        disabled={submitReportMutation.isPending}>
                        {submitReportMutation.isPending
                            ? "Submitting..."
                            : "Submit Report"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
