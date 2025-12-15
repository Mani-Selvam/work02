import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    ListTodo,
    UserCheck,
    MoreVertical,
    Edit,
    Trash2,
    Undo2,
    Eye,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import type { Task, User } from "@shared/schema";

export default function AdminTasks() {
    const { toast } = useToast();
    const { dbUserId } = useAuth();
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        deadline: "",
    });
    const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
    const [selectedTaskForDetails, setSelectedTaskForDetails] =
        useState<Task | null>(null);
    const [taskDetailsData, setTaskDetailsData] = useState<any>(null);

    const handleViewTaskDetails = async (task: Task) => {
        setSelectedTaskForDetails(task);
        try {
            const response = await apiRequest(
                `${API_BASE_URL}/api/tasks/${task.id}/details`,
                "GET"
            );
            setTaskDetailsData(response);
            setTaskDetailsOpen(true);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load task details",
                variant: "destructive",
            });
        }
    };

    const safeConvertToISO = (
        dateValue: string | null | undefined
    ): string | null => {
        if (!dateValue) return null;
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
        } catch {
            return null;
        }
    };

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: ["/api/tasks"],
    });

    const { data: myTasks = [], isLoading: myTasksLoading } = useQuery<Task[]>({
        queryKey: [`/api/tasks?assignedBy=${dbUserId}`],
        enabled: !!dbUserId,
    });

    const createTaskMutation = useMutation({
        mutationFn: async (taskData: typeof taskForm) => {
            const payload = {
                assignedBy: dbUserId,
                assignedTo: parseInt(taskData.assignedTo),
                title: taskData.title,
                description: taskData.description || null,
                priority: taskData.priority,
                deadline: safeConvertToISO(taskData.deadline),
                status: "pending",
            };
            return await apiRequest(
                `${API_BASE_URL}/api/tasks`,
                "POST",
                payload
            );
        },
        onSuccess: () => {
            toast({
                title: "Task created successfully",
                description: "The task has been assigned to the user.",
            });
            setTaskDialogOpen(false);
            setTaskForm({
                title: "",
                description: "",
                assignedTo: "",
                priority: "medium",
                deadline: "",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            queryClient.invalidateQueries({
                queryKey: [`/api/tasks?assignedBy=${dbUserId}`],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/dashboard/stats"],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to create task",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({
            taskId,
            taskData,
        }: {
            taskId: number;
            taskData: typeof taskForm;
        }) => {
            const payload = {
                assignedTo: parseInt(taskData.assignedTo),
                title: taskData.title,
                description: taskData.description || null,
                priority: taskData.priority,
                deadline: safeConvertToISO(taskData.deadline),
            };
            return await apiRequest(
                `${API_BASE_URL}/api/tasks/${taskId}`,
                "PATCH",
                payload
            );
        },
        onSuccess: () => {
            toast({
                title: "Task updated successfully",
            });
            setTaskDialogOpen(false);
            setEditingTask(null);
            setTaskForm({
                title: "",
                description: "",
                assignedTo: "",
                priority: "medium",
                deadline: "",
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/tasks"],
            });
            queryClient.invalidateQueries({
                queryKey: [`/api/tasks?assignedBy=${dbUserId}`],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update task",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/tasks/${taskId}`,
                "DELETE"
            );
        },
        onSuccess: () => {
            toast({
                title: "Task deleted successfully",
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/tasks"],
            });
            queryClient.invalidateQueries({
                queryKey: [`/api/tasks?assignedBy=${dbUserId}`],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete task",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const returnTaskMutation = useMutation({
        mutationFn: async (taskId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/tasks/${taskId}`,
                "PATCH",
                { status: "pending" }
            );
        },
        onSuccess: () => {
            toast({
                title: "Task returned to pending",
            });
            queryClient.invalidateQueries({
                queryKey: [`${API_BASE_URL}/api/tasks`],
            });
            queryClient.invalidateQueries({
                queryKey: [`/api/tasks?assignedBy=${dbUserId}`],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to return task",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const getUserNameById = (userId: number) => {
        const user = users.find((u) => u.id === userId);
        return user?.displayName || "Unknown User";
    };

    const handleCreateTask = () => {
        if (!taskForm.title || !taskForm.assignedTo) {
            toast({
                title: "Missing required fields",
                description: "Please fill in task title and assign to a user.",
                variant: "destructive",
            });
            return;
        }
        if (editingTask) {
            updateTaskMutation.mutate({
                taskId: editingTask.id,
                taskData: taskForm,
            });
        } else {
            createTaskMutation.mutate(taskForm);
        }
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            assignedTo: task.assignedTo.toString(),
            priority: task.priority,
            deadline: task.deadline
                ? new Date(task.deadline).toISOString().slice(0, 16)
                : "",
        });
        setTaskDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setTaskDialogOpen(false);
        setEditingTask(null);
        setTaskForm({
            title: "",
            description: "",
            assignedTo: "",
            priority: "medium",
            deadline: "",
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">
                        Task Management
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        Assign and track tasks
                    </p>
                </div>
                <Button
                    className="gap-2"
                    onClick={() => {
                        setEditingTask(null);
                        setTaskForm({
                            title: "",
                            description: "",
                            assignedTo: "",
                            priority: "medium",
                            deadline: "",
                        });
                        setTaskDialogOpen(true);
                    }}
                    data-testid="button-open-task-dialog">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Task</span>
                </Button>
            </div>

            <Dialog
                open={taskDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCloseDialog();
                    }
                }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTask ? "Edit Task" : "Create New Task"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTask
                                ? "Update task details"
                                : "Assign a new task to one or more users"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="task-title">Task Title *</Label>
                            <Input
                                id="task-title"
                                placeholder="Enter task title"
                                value={taskForm.title}
                                onChange={(e) =>
                                    setTaskForm({
                                        ...taskForm,
                                        title: e.target.value,
                                    })
                                }
                                data-testid="input-task-title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-description">
                                Description
                            </Label>
                            <Textarea
                                id="task-description"
                                placeholder="Enter task description"
                                value={taskForm.description}
                                onChange={(e) =>
                                    setTaskForm({
                                        ...taskForm,
                                        description: e.target.value,
                                    })
                                }
                                data-testid="input-task-description"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="assign-to">
                                    Assign To Member *
                                </Label>
                                <Select
                                    value={taskForm.assignedTo}
                                    onValueChange={(value) =>
                                        setTaskForm({
                                            ...taskForm,
                                            assignedTo: value,
                                        })
                                    }>
                                    <SelectTrigger data-testid="select-assign-to">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users
                                            .filter(
                                                (u) =>
                                                    u.role === "team_leader" ||
                                                    u.role === "company_member"
                                            )
                                            .map((user) => (
                                                <SelectItem
                                                    key={user.id}
                                                    value={user.id.toString()}>
                                                    {user.displayName} (
                                                    {user.role === "team_leader"
                                                        ? "Team Leader"
                                                        : "Member"}
                                                    )
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={taskForm.priority}
                                    onValueChange={(value) =>
                                        setTaskForm({
                                            ...taskForm,
                                            priority: value,
                                        })
                                    }>
                                    <SelectTrigger data-testid="select-priority">
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
                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                                id="deadline"
                                type="datetime-local"
                                value={taskForm.deadline}
                                onChange={(e) =>
                                    setTaskForm({
                                        ...taskForm,
                                        deadline: e.target.value,
                                    })
                                }
                                data-testid="input-deadline"
                            />
                        </div>
                        <Button
                            onClick={handleCreateTask}
                            className="w-full"
                            data-testid="button-create-task"
                            disabled={
                                createTaskMutation.isPending ||
                                updateTaskMutation.isPending
                            }>
                            {createTaskMutation.isPending ||
                            updateTaskMutation.isPending
                                ? editingTask
                                    ? "Updating..."
                                    : "Creating..."
                                : editingTask
                                ? "Update Task"
                                : "Create Task"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Task Details Modal */}
            {selectedTaskForDetails && (
                <TaskDetailsModal
                    open={taskDetailsOpen}
                    onOpenChange={setTaskDetailsOpen}
                    task={selectedTaskForDetails}
                    timeLogs={taskDetailsData?.timeLogs}
                    returnCount={taskDetailsData?.returnCount || 0}
                    reworkHistory={taskDetailsData?.reworkHistory}
                />
            )}

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger
                        value="all"
                        className="flex items-center gap-2">
                        <ListTodo className="h-4 w-4" />
                        All Tasks ({allTasks.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="mine"
                        className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        My Created Tasks ({myTasks.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl">
                                All Tasks ({allTasks.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tasksLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : allTasks.length > 0 ? (
                                <div className="overflow-x-auto -mx-3 sm:mx-0">
                                    <div className="min-w-full inline-block align-middle">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Task
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Assigned To
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Priority
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Status
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Deadline
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allTasks.map(
                                                    (
                                                        task: any,
                                                        index: number
                                                    ) => (
                                                        <tr
                                                            key={task.id}
                                                            className={`border-b ${
                                                                index % 2 === 0
                                                                    ? "bg-card"
                                                                    : "bg-muted/20"
                                                            } hover-elevate`}
                                                            data-testid={`row-task-${task.id}`}>
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-xs sm:text-sm">
                                                                    {task.title}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                                    {task.description ||
                                                                        "—"}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs sm:text-sm">
                                                                {getUserNameById(
                                                                    task.assignedTo
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <Badge
                                                                    variant={
                                                                        task.priority ===
                                                                        "high"
                                                                            ? "destructive"
                                                                            : task.priority ===
                                                                              "medium"
                                                                            ? "default"
                                                                            : "secondary"
                                                                    }
                                                                    className="text-xs">
                                                                    {
                                                                        task.priority
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <Badge
                                                                    variant={
                                                                        task.status ===
                                                                        "completed"
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    className="text-xs">
                                                                    {
                                                                        task.status
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-mono">
                                                                {task.deadline
                                                                    ? format(
                                                                          new Date(
                                                                              task.deadline
                                                                          ),
                                                                          "MMM dd, yyyy"
                                                                      )
                                                                    : "—"}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {task.assignedBy ===
                                                                    dbUserId && (
                                                                    <div className="flex justify-end">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger
                                                                                asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8"
                                                                                    data-testid={`button-task-actions-${task.id}`}>
                                                                                    <MoreVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleViewTaskDetails(
                                                                                            task
                                                                                        )
                                                                                    }
                                                                                    data-testid={`menu-view-details-${task.id}`}>
                                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                                    View
                                                                                    Details
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleEditTask(
                                                                                            task
                                                                                        )
                                                                                    }
                                                                                    data-testid={`menu-edit-task-${task.id}`}>
                                                                                    <Edit className="h-4 w-4 mr-2" />
                                                                                    Edit
                                                                                </DropdownMenuItem>
                                                                                {(task.status ===
                                                                                    "completed" ||
                                                                                    task.status ===
                                                                                        "in_progress") && (
                                                                                    <DropdownMenuItem
                                                                                        onClick={() =>
                                                                                            returnTaskMutation.mutate(
                                                                                                task.id
                                                                                            )
                                                                                        }
                                                                                        data-testid={`menu-return-task-${task.id}`}>
                                                                                        <Undo2 className="h-4 w-4 mr-2" />
                                                                                        Return
                                                                                        to
                                                                                        Pending
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    className="text-destructive"
                                                                                    onClick={() =>
                                                                                        deleteTaskMutation.mutate(
                                                                                            task.id
                                                                                        )
                                                                                    }
                                                                                    data-testid={`menu-delete-task-${task.id}`}>
                                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                                    Delete
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No tasks found
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mine">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl">
                                Tasks I Created ({myTasks.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myTasksLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : myTasks.length > 0 ? (
                                <div className="overflow-x-auto -mx-3 sm:mx-0">
                                    <div className="min-w-full inline-block align-middle">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Task
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Assigned To
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Priority
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Status
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Deadline
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {myTasks.map(
                                                    (
                                                        task: any,
                                                        index: number
                                                    ) => (
                                                        <tr
                                                            key={task.id}
                                                            className={`border-b ${
                                                                index % 2 === 0
                                                                    ? "bg-card"
                                                                    : "bg-muted/20"
                                                            } hover-elevate`}
                                                            data-testid={`row-task-${task.id}`}>
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-xs sm:text-sm">
                                                                    {task.title}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                                    {task.description ||
                                                                        "—"}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs sm:text-sm">
                                                                {getUserNameById(
                                                                    task.assignedTo
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <Badge
                                                                    variant={
                                                                        task.priority ===
                                                                        "high"
                                                                            ? "destructive"
                                                                            : task.priority ===
                                                                              "medium"
                                                                            ? "default"
                                                                            : "secondary"
                                                                    }
                                                                    className="text-xs">
                                                                    {
                                                                        task.priority
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <Badge
                                                                    variant={
                                                                        task.status ===
                                                                        "completed"
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    className="text-xs">
                                                                    {
                                                                        task.status
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-mono">
                                                                {task.deadline
                                                                    ? format(
                                                                          new Date(
                                                                              task.deadline
                                                                          ),
                                                                          "MMM dd, yyyy"
                                                                      )
                                                                    : "—"}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex justify-end">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8"
                                                                                data-testid={`button-my-task-actions-${task.id}`}>
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    handleViewTaskDetails(
                                                                                        task
                                                                                    )
                                                                                }
                                                                                data-testid={`menu-view-details-my-task-${task.id}`}>
                                                                                <Eye className="h-4 w-4 mr-2" />
                                                                                View
                                                                                Details
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    handleEditTask(
                                                                                        task
                                                                                    )
                                                                                }
                                                                                data-testid={`menu-edit-my-task-${task.id}`}>
                                                                                <Edit className="h-4 w-4 mr-2" />
                                                                                Edit
                                                                            </DropdownMenuItem>
                                                                            {(task.status ===
                                                                                "completed" ||
                                                                                task.status ===
                                                                                    "in_progress") && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        returnTaskMutation.mutate(
                                                                                            task.id
                                                                                        )
                                                                                    }
                                                                                    data-testid={`menu-return-my-task-${task.id}`}>
                                                                                    <Undo2 className="h-4 w-4 mr-2" />
                                                                                    Return
                                                                                    to
                                                                                    Pending
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                className="text-destructive"
                                                                                onClick={() =>
                                                                                    deleteTaskMutation.mutate(
                                                                                        task.id
                                                                                    )
                                                                                }
                                                                                data-testid={`menu-delete-my-task-${task.id}`}>
                                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                                Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    You haven't created any tasks yet
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
