import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Calendar,
    User,
    Edit,
    Trash2,
    ClipboardList,
    Users,
    Play,
    Pause,
    CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTaskUpdates } from "@/hooks/useTaskUpdates";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
    id: number;
    title: string;
    description?: string;
    assignedTo: number;
    assignedBy: number;
    deadline: string | null;
    priority: string;
    status: string;
    companyId: number;
}

interface TeamMember {
    id: number;
    displayName: string;
    uniqueUserId: string;
}

export default function TeamTasks() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        assignedTo: "",
        deadline: "",
        priority: "medium",
        status: "pending",
    });
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
        const savedTimers = localStorage.getItem("taskTimers");
        if (savedTimers) {
            try {
                setTimerStates(JSON.parse(savedTimers));
            } catch (e) {
                console.error("Failed to load timer state:", e);
            }
        }

        const savedCompletedIds = localStorage.getItem("completedTaskIds");
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
                                "completedTaskIds",
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
                            "taskTimers",
                            JSON.stringify({
                                ...JSON.parse(
                                    localStorage.getItem("taskTimers") || "{}"
                                ),
                                [message.taskId]: {
                                    isRunning: false,
                                    elapsed: 0,
                                },
                            })
                        );
                    }
                    // Invalidate queries to force refetch
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
    }, []);

    // Save timer state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("taskTimers", JSON.stringify(timerStates));
    }, [timerStates]);

    // Save completed task IDs to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(
            "completedTaskIds",
            JSON.stringify(Array.from(completedTaskIds))
        );
    }, [completedTaskIds]);

    const { data: teamMembers = [] } = useQuery<TeamMember[]>({
        queryKey: [`/api/team-assignments/${dbUserId}/members`],
        enabled: !!dbUserId,
    });

    const { data: allTasks = [], isLoading } = useQuery<Task[]>({
        queryKey: ["/api/tasks"],
    });

    const teamMemberIds = teamMembers.map((m) => m.id);
    const leaderTasks = allTasks.filter((task) => task.assignedTo === dbUserId);
    const teamMemberTasks = allTasks.filter((task) =>
        teamMemberIds.includes(task.assignedTo)
    );

    const createTaskMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest(`${API_BASE_URL}/api/tasks`, "POST", {
                ...data,
                assignedBy: dbUserId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/tasks"],
            });
            setIsCreateOpen(false);
            resetForm();
            toast({
                title: "Success",
                description: "Task created successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create task",
                variant: "destructive",
            });
        },
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            return apiRequest(`${API_BASE_URL}/api/tasks/${id}`, "PATCH", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/tasks"],
            });
            setIsEditOpen(false);
            setSelectedTask(null);
            toast({
                title: "Success",
                description: "Task updated successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update task",
                variant: "destructive",
            });
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId: number) => {
            return apiRequest(`${API_BASE_URL}/api/tasks/${taskId}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/tasks"],
            });
            toast({
                title: "Success",
                description: "Task deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete task",
                variant: "destructive",
            });
        },
    });

    const resetForm = () => {
        setTaskForm({
            title: "",
            description: "",
            assignedTo: "",
            deadline: "",
            priority: "medium",
            status: "pending",
        });
    };

    const handleCreate = () => {
        if (!taskForm.title || !taskForm.assignedTo || !taskForm.deadline) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }
        createTaskMutation.mutate({
            ...taskForm,
            assignedTo: parseInt(taskForm.assignedTo),
            deadline: taskForm.deadline
                ? new Date(taskForm.deadline).toISOString()
                : null,
        });
    };

    const handleEdit = (task: Task) => {
        setSelectedTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            assignedTo: task.assignedTo.toString(),
            deadline: task.deadline ? task.deadline.split("T")[0] : "",
            priority: task.priority,
            status: task.status,
        });
        setIsEditOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedTask) return;
        updateTaskMutation.mutate({
            id: selectedTask.id,
            ...taskForm,
            assignedTo: parseInt(taskForm.assignedTo),
            deadline: taskForm.deadline
                ? new Date(taskForm.deadline).toISOString()
                : null,
        });
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

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0"
        )}:${String(secs).padStart(2, "0")}`;
    };

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
                queryKey: ["/api/tasks"],
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
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Tasks</h1>
                    <p className="text-muted-foreground">
                        View your assigned tasks and manage team tasks
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button
                            data-testid="button-create-task"
                            onClick={resetForm}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Task for Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>
                                Assign a new task to one of your team members
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title">Task Title *</Label>
                                <Input
                                    id="title"
                                    value={taskForm.title}
                                    onChange={(e) =>
                                        setTaskForm({
                                            ...taskForm,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="Enter task title"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={taskForm.description}
                                    onChange={(e) =>
                                        setTaskForm({
                                            ...taskForm,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Enter task description"
                                />
                            </div>
                            <div>
                                <Label htmlFor="assignedTo">Assign To *</Label>
                                <Select
                                    value={taskForm.assignedTo}
                                    onValueChange={(value) =>
                                        setTaskForm({
                                            ...taskForm,
                                            assignedTo: value,
                                        })
                                    }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select team member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers.map((member) => (
                                            <SelectItem
                                                key={member.id}
                                                value={member.id.toString()}>
                                                {member.displayName} (
                                                {member.uniqueUserId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="deadline">Deadline *</Label>
                                    <Input
                                        id="deadline"
                                        type="date"
                                        value={taskForm.deadline}
                                        onChange={(e) =>
                                            setTaskForm({
                                                ...taskForm,
                                                deadline: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={taskForm.priority}
                                        onValueChange={(value) =>
                                            setTaskForm({
                                                ...taskForm,
                                                priority: value,
                                            })
                                        }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">
                                                Low
                                            </SelectItem>
                                            <SelectItem value="medium">
                                                Medium
                                            </SelectItem>
                                            <SelectItem value="high">
                                                High
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createTaskMutation.isPending}>
                                {createTaskMutation.isPending
                                    ? "Creating..."
                                    : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="my-tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger
                        value="my-tasks"
                        className="flex items-center gap-2"
                        data-testid="tab-my-tasks">
                        <ClipboardList className="h-4 w-4" />
                        My Assigned Tasks ({leaderTasks.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="team-tasks"
                        className="flex items-center gap-2"
                        data-testid="tab-team-tasks">
                        <Users className="h-4 w-4" />
                        Team Member Tasks ({teamMemberTasks.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="my-tasks">
                    <div className="grid gap-4">
                        {leaderTasks.map((task) => {
                            const timer = timerStates[task.id] || {
                                isRunning: false,
                                elapsed: 0,
                            };
                            return (
                                <Card
                                    key={task.id}
                                    data-testid={`card-leader-task-${task.id}`}>
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
                                                    {task.status.replace(
                                                        "_",
                                                        " "
                                                    )}
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
                                                        {formatTime(
                                                            timer.elapsed
                                                        )}
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
                                                            disabled={
                                                                updateTaskMutation.isPending
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

                    {leaderTasks.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <p className="text-muted-foreground">
                                    No tasks assigned to you yet
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Tasks assigned by admin will appear here
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="team-tasks">
                    <div className="grid gap-4">
                        {teamMemberTasks.map((task) => {
                            const assignedMember = teamMembers.find(
                                (m) => m.id === task.assignedTo
                            );
                            return (
                                <Card
                                    key={task.id}
                                    data-testid={`card-team-task-${task.id}`}>
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
                                                    <User className="h-4 w-4" />
                                                    <span>
                                                        {assignedMember?.displayName ||
                                                            "Unknown"}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        •
                                                    </span>
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
                                                    {task.status.replace(
                                                        "_",
                                                        " "
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(task)}
                                                data-testid={`button-edit-task-${task.id}`}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {teamMemberTasks.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <p className="text-muted-foreground">
                                    No team member tasks yet
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Create a task to assign to your team members
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>
                            Update task details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-title">Task Title *</Label>
                            <Input
                                id="edit-title"
                                value={taskForm.title}
                                onChange={(e) =>
                                    setTaskForm({
                                        ...taskForm,
                                        title: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-description">
                                Description
                            </Label>
                            <Textarea
                                id="edit-description"
                                value={taskForm.description}
                                onChange={(e) =>
                                    setTaskForm({
                                        ...taskForm,
                                        description: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-status">Status</Label>
                            <Select
                                value={taskForm.status}
                                onValueChange={(value) =>
                                    setTaskForm({ ...taskForm, status: value })
                                }>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">
                                        Pending
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                        In Progress
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        Completed
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-deadline">Deadline</Label>
                                <Input
                                    id="edit-deadline"
                                    type="date"
                                    value={taskForm.deadline}
                                    onChange={(e) =>
                                        setTaskForm({
                                            ...taskForm,
                                            deadline: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-priority">Priority</Label>
                                <Select
                                    value={taskForm.priority}
                                    onValueChange={(value) =>
                                        setTaskForm({
                                            ...taskForm,
                                            priority: value,
                                        })
                                    }>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">
                                            Medium
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={updateTaskMutation.isPending}>
                            {updateTaskMutation.isPending
                                ? "Updating..."
                                : "Update Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
