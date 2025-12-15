import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Play, Pause, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTaskUpdates } from "@/hooks/useTaskUpdates";
import type { Task } from "@shared/schema";

export default function Tasks() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();
    const [timerStates, setTimerStates] = useState<
        Record<number, { isRunning: boolean; elapsed: number }>
    >({});
    const [timerIntervals, setTimerIntervals] = useState<
        Record<number, NodeJS.Timeout>
    >({});
    const [completedTaskIds, setCompletedTaskIds] = useState<Set<number>>(
        new Set()
    );

    // Load timer state from localStorage on mount
    useEffect(() => {
        const savedTimers = localStorage.getItem("memberTaskTimers");
        if (savedTimers) {
            try {
                setTimerStates(JSON.parse(savedTimers));
            } catch (e) {
                console.error("Failed to load timer state:", e);
            }
        }

        const savedCompletedIds = localStorage.getItem(
            "memberCompletedTaskIds"
        );
        if (savedCompletedIds) {
            try {
                setCompletedTaskIds(new Set(JSON.parse(savedCompletedIds)));
            } catch (e) {
                console.error("Failed to load completed task IDs:", e);
            }
        }
    }, []);

    // Listen to WebSocket updates to handle status changes
    useEffect(() => {
        const ws = new WebSocket(
            `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
                window.location.host
            }/ws`
        );

        ws.onopen = () => {
            console.log("[WebSocket] Connected for task updates");
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "task_updated") {
                    console.log("[WebSocket] Task update received:", message);
                    // If task was reverted to pending, clear it from completed
                    if (message.status === "pending") {
                        setCompletedTaskIds((prev) => {
                            const updated = new Set(prev);
                            updated.delete(message.taskId);
                            // Update localStorage immediately
                            localStorage.setItem(
                                "memberCompletedTaskIds",
                                JSON.stringify(Array.from(updated))
                            );
                            return updated;
                        });
                        // Also reset timer for this task
                        setTimerStates((prev) => ({
                            ...prev,
                            [message.taskId]: { isRunning: false, elapsed: 0 },
                        }));
                        // Clear from localStorage
                        localStorage.setItem(
                            "memberTaskTimers",
                            JSON.stringify({
                                ...JSON.parse(
                                    localStorage.getItem("memberTaskTimers") ||
                                        "{}"
                                ),
                                [message.taskId]: {
                                    isRunning: false,
                                    elapsed: 0,
                                },
                            })
                        );
                    }
                    // Invalidate queries to force refetch
                    queryClient.invalidateQueries({
                        queryKey: ["/api/tasks", dbUserId],
                    });
                    queryClient.invalidateQueries({
                        queryKey: ["/api/dashboard/stats"],
                    });
                }
            } catch (error) {
                console.error("[WebSocket] Error parsing message:", error);
            }
        };

        ws.onerror = (error) => {
            console.error("[WebSocket] Error:", error);
        };

        return () => {
            ws.close();
        };
    }, [dbUserId]);

    // Save timer state to localStorage
    useEffect(() => {
        localStorage.setItem("memberTaskTimers", JSON.stringify(timerStates));
    }, [timerStates]);

    // Save completed task IDs to localStorage
    useEffect(() => {
        localStorage.setItem(
            "memberCompletedTaskIds",
            JSON.stringify(Array.from(completedTaskIds))
        );
    }, [completedTaskIds]);

    const { data: tasks = [], isLoading } = useQuery<Task[]>({
        queryKey: ["/api/tasks", dbUserId],
        queryFn: async () => {
            const user = localStorage.getItem("user");
            const userId = user ? JSON.parse(user).id : null;
            const headers: Record<string, string> = {};
            if (userId) {
                headers["x-user-id"] = userId.toString();
            }

            const res = await fetch(
                `${API_BASE_URL}/api/tasks?userId=${dbUserId}`,
                { headers, credentials: "include" }
            );
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        },
        enabled: !!dbUserId,
    });

    const startTimer = (taskId: number) => {
        setTimerStates((prev) => ({
            ...prev,
            [taskId]: { isRunning: true, elapsed: prev[taskId]?.elapsed || 0 },
        }));

        const interval = setInterval(() => {
            setTimerStates((prev) => ({
                ...prev,
                [taskId]: {
                    isRunning: true,
                    elapsed: (prev[taskId]?.elapsed || 0) + 1,
                },
            }));
        }, 1000);

        setTimerIntervals((prev) => ({
            ...prev,
            [taskId]: interval,
        }));
    };

    const pauseTimer = (taskId: number) => {
        setTimerStates((prev) => ({
            ...prev,
            [taskId]: { ...prev[taskId], isRunning: false },
        }));
        if (timerIntervals[taskId]) {
            clearInterval(timerIntervals[taskId]);
        }
    };

    const completeTask = async (taskId: number) => {
        try {
            pauseTimer(taskId);
            const timer = timerStates[taskId];
            console.log("Completing task:", taskId);

            await apiRequest(
                `${API_BASE_URL}/api/tasks/${taskId}/timer/complete`,
                "POST",
                {
                    userId: dbUserId,
                    date: new Date().toISOString().split("T")[0],
                    duration: timer?.elapsed || 0,
                }
            );
            console.log("Timer completed");

            // Use the status endpoint to update task status
            console.log("Updating status for task:", taskId);
            await apiRequest(
                `${API_BASE_URL}/api/tasks/${taskId}/status`,
                "PATCH",
                {
                    status: "completed",
                }
            );
            console.log("Status updated");

            // Invalidate queries to refresh data
            await queryClient.invalidateQueries({
                queryKey: ["/api/tasks", dbUserId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["/api/dashboard/stats"],
            });
            console.log("Queries invalidated");

            const newCompleted = new Set(completedTaskIds);
            newCompleted.add(taskId);
            setCompletedTaskIds(newCompleted);
            toast({
                title: "Success",
                description: "Task completed successfully",
            });
        } catch (error: any) {
            console.error("Error completing task:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to complete task",
                variant: "destructive",
            });
        }
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0"
        )}:${String(secs).padStart(2, "0")}`;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "destructive";
            case "medium":
                return "default";
            case "low":
                return "secondary";
            default:
                return "secondary";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "default";
            case "in_progress":
                return "default";
            case "pending":
                return "secondary";
            default:
                return "secondary";
        }
    };

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
                    Assigned Tasks
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned
                </p>
            </div>

            {tasks.length > 0 ? (
                <div className="space-y-4">
                    {tasks.map((task) => {
                        const timer = timerStates[task.id] || {
                            isRunning: false,
                            elapsed: 0,
                        };
                        return (
                            <Card
                                key={task.id}
                                data-testid={`card-task-${task.id}`}>
                                <CardHeader>
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg">
                                                {task.title}
                                            </CardTitle>
                                            {task.description && (
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {task.deadline
                                                        ? new Date(
                                                              task.deadline
                                                          ).toLocaleDateString()
                                                        : "No deadline"}
                                                </span>
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant={getPriorityColor(
                                                    task.priority
                                                )}>
                                                {task.priority}
                                            </Badge>
                                            <Badge
                                                variant={getStatusColor(
                                                    task.status
                                                )}>
                                                {task.status.replace("_", " ")}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-4">
                                        {completedTaskIds.has(task.id) ? (
                                            <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900 rounded-md">
                                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                <span className="text-green-800 dark:text-green-200 font-semibold">
                                                    Task Completed
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-mono font-semibold">
                                                    {formatTime(timer.elapsed)}
                                                </span>
                                                <div className="flex gap-2">
                                                    {!timer.isRunning ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                startTimer(
                                                                    task.id
                                                                )
                                                            }
                                                            data-testid={`button-start-timer-${task.id}`}>
                                                            <Play className="h-4 w-4 mr-2" />
                                                            Start
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() =>
                                                                pauseTimer(
                                                                    task.id
                                                                )
                                                            }
                                                            data-testid={`button-pause-timer-${task.id}`}>
                                                            <Pause className="h-4 w-4 mr-2" />
                                                            Pause
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            completeTask(
                                                                task.id
                                                            )
                                                        }
                                                        data-testid={`button-complete-task-${task.id}`}>
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        Complete
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">
                            No tasks assigned yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Check back later for new tasks
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
