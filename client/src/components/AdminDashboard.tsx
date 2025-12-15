import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import AppSidebar from "./AppSidebar";
import MetricCard from "./MetricCard";
import ThemeToggle from "./ThemeToggle";
import {
    Users,
    FileText,
    CheckCircle,
    FolderOpen,
    Plus,
    Search,
    LogOut,
    MessageSquare,
    Send,
} from "lucide-react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
    User,
    Report,
    Task,
    Message,
    GroupMessage,
    Rating,
} from "@shared/schema";

export default function AdminDashboard() {
    const { user, signOut, dbUserId } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [dateFilter, setDateFilter] = useState({
        startDate: "",
        endDate: "",
    });
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        deadline: "",
    });

    const [privateMessageForm, setPrivateMessageForm] = useState({
        receiverId: "",
        message: "",
    });

    const [groupMessageForm, setGroupMessageForm] = useState({
        title: "",
        message: "",
    });

    const [ratingForm, setRatingForm] = useState({
        userId: "",
        rating: "",
        feedback: "",
        period: "weekly",
    });

    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

    const handleWebSocketMessage = useCallback((data: any) => {
        if (data.type === "USERS_UPDATED") {
            queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/users`] });
            queryClient.invalidateQueries({
                queryKey: [`${API_BASE_URL}/api/dashboard/stats`],
            });
        }
    }, []);

    useWebSocket(handleWebSocketMessage);

    const { data: stats } = useQuery<{
        totalUsers: number;
        todayReports: number;
        pendingTasks: number;
        completedTasks: number;
        totalFiles: number;
    }>({
        queryKey: [`${API_BASE_URL}/api/dashboard/stats`],
    });

    const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: [`${API_BASE_URL}/api/users`],
    });

    const { data: reports = [], isLoading: reportsLoading } = useQuery<
        Report[]
    >({
        queryKey: [`${API_BASE_URL}/api/reports`, dateFilter.startDate, dateFilter.endDate],
        queryFn: async () => {
            let url = `${API_BASE_URL}/api/reports`;
            const params = new URLSearchParams();
            if (dateFilter.startDate)
                params.append("startDate", dateFilter.startDate);
            if (dateFilter.endDate)
                params.append("endDate", dateFilter.endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch reports");
            return res.json();
        },
    });

    const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: [`${API_BASE_URL}/api/tasks`],
    });

    const { data: privateMessages = [] } = useQuery<Message[]>({
        queryKey: [`${API_BASE_URL}/api/messages`],
    });

    const { data: groupMessages = [] } = useQuery<GroupMessage[]>({
        queryKey: [`${API_BASE_URL}/api/group-messages`],
    });

    const { data: allRatings = [] } = useQuery<Rating[]>({
        queryKey: [`${API_BASE_URL}/api/ratings`],
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            return await apiRequest(`/api/users/${userId}`, "DELETE");
        },
        onSuccess: () => {
            toast({
                title: "User removed successfully",
                description: "The user has been deleted from the system.",
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to remove user",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    const sendPrivateMessageMutation = useMutation({
        mutationFn: async (messageData: typeof privateMessageForm) => {
            return await apiRequest(`${API_BASE_URL}/api/messages`, "POST", {
                senderId: dbUserId,
                receiverId: parseInt(messageData.receiverId),
                message: messageData.message,
                readStatus: false,
            });
        },
        onSuccess: () => {
            toast({
                title: "Message sent successfully",
            });
            setPrivateMessageForm({ receiverId: "", message: "" });
            queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/messages`] });
        },
        onError: (error) => {
            toast({
                title: "Failed to send message",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const sendGroupMessageMutation = useMutation({
        mutationFn: async (messageData: typeof groupMessageForm) => {
            return await apiRequest(`${API_BASE_URL}/api/group-messages`, "POST", {
                title: messageData.title || null,
                message: messageData.message,
            });
        },
        onSuccess: () => {
            toast({
                title: "Announcement sent successfully",
            });
            setGroupMessageForm({ title: "", message: "" });
            queryClient.invalidateQueries({
                queryKey: [`${API_BASE_URL}/api/group-messages`],
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to send announcement",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const createRatingMutation = useMutation({
        mutationFn: async (ratingData: typeof ratingForm) => {
            return await apiRequest(`${API_BASE_URL}/api/ratings`, "POST", {
                userId: parseInt(ratingData.userId),
                rating: ratingData.rating,
                feedback: ratingData.feedback || null,
                period: ratingData.period,
            });
        },
        onSuccess: () => {
            toast({
                title: "Rating submitted successfully",
            });
            setRatingForm({
                userId: "",
                rating: "",
                feedback: "",
                period: "weekly",
            });
            setRatingDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/ratings`] });
        },
        onError: (error) => {
            toast({
                title: "Failed to submit rating",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const createTaskMutation = useMutation({
        mutationFn: async (taskData: typeof taskForm) => {
            const payload = {
                assignedBy: dbUserId,
                assignedTo: parseInt(taskData.assignedTo),
                title: taskData.title,
                description: taskData.description || null,
                priority: taskData.priority,
                deadline: taskData.deadline
                    ? new Date(taskData.deadline).toISOString()
                    : null,
                status: "pending",
            };
            return await apiRequest(`${API_BASE_URL}/api/tasks`, "POST", payload);
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
            queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/tasks`] });
            queryClient.invalidateQueries({
                queryKey: [`${API_BASE_URL}/api/dashboard/stats`],
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

    const handleCreateTask = () => {
        if (!taskForm.title || !taskForm.assignedTo) {
            toast({
                title: "Missing required fields",
                description: "Please fill in task title and assign to a user.",
                variant: "destructive",
            });
            return;
        }
        createTaskMutation.mutate(taskForm);
    };

    const handleLogout = async () => {
        try {
            await signOut();
            setLocation("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const style = {
        "--sidebar-width": "20rem",
        "--sidebar-width-icon": "4rem",
    };

    const getUserNameById = (userId: number) => {
        const user = users.find((u) => u.id === userId);
        return user?.displayName || "Unknown User";
    };

    const filteredReports = reports.filter((report) => {
        const userName = getUserNameById(report.userId);
        return userName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleViewReport = (report: Report) => {
        setSelectedReport(report);
        setReportDialogOpen(true);
    };

    const adminName = user?.displayName || "Admin";
    const adminAvatar = user?.photoURL || "";
    const adminInitials = adminName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
                <AppSidebar />

                <div className="flex flex-col flex-1">
                    {/* Header */}
                    <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
                        <div className="flex items-center justify-between p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <SidebarTrigger data-testid="button-sidebar-toggle" />
                                <h1 className="text-lg sm:text-2xl font-bold">
                                    Admin Dashboard
                                </h1>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <ThemeToggle />
                                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l">
                                    <Avatar
                                        className="h-8 w-8 sm:h-10 sm:w-10"
                                        data-testid="avatar-admin">
                                        <AvatarImage src={adminAvatar} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                                            {adminInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleLogout}
                                        data-testid="button-logout"
                                        className="h-8 w-8 sm:h-10 sm:w-10">
                                        <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
                        {/* Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            <MetricCard
                                title="Total Users"
                                value={stats?.totalUsers?.toString() || "0"}
                                icon={Users}
                                trend=""
                            />
                            <MetricCard
                                title="Today's Reports"
                                value={stats?.todayReports?.toString() || "0"}
                                icon={FileText}
                                trend=""
                            />
                            <MetricCard
                                title="Pending Tasks"
                                value={stats?.pendingTasks?.toString() || "0"}
                                icon={CheckCircle}
                                trend=""
                            />
                            <MetricCard
                                title="Completed Tasks"
                                value={stats?.completedTasks?.toString() || "0"}
                                icon={CheckCircle}
                                trend=""
                            />
                            <MetricCard
                                title="Uploaded Files"
                                value={stats?.totalFiles?.toString() || "0"}
                                icon={FolderOpen}
                                trend=""
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                            <Dialog
                                open={taskDialogOpen}
                                onOpenChange={setTaskDialogOpen}>
                                <DialogTrigger asChild>
                                    <Card
                                        className="cursor-pointer hover-elevate active-elevate-2"
                                        data-testid="card-create-task">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-lg">
                                                <Plus className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">
                                                    Create New Task
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Assign tasks to users
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Create New Task
                                        </DialogTitle>
                                        <DialogDescription>
                                            Assign a new task to one or more
                                            users
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="task-title">
                                                Task Title *
                                            </Label>
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
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                                data-testid="input-task-description"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="assign-to">
                                                    Assign To *
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
                                                        <SelectValue placeholder="Select user" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users
                                                            .filter(
                                                                (u) =>
                                                                    u.role ===
                                                                    "user"
                                                            )
                                                            .map((user) => (
                                                                <SelectItem
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    value={user.id.toString()}>
                                                                    {
                                                                        user.displayName
                                                                    }
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="priority">
                                                    Priority
                                                </Label>
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
                                        <div className="space-y-2">
                                            <Label htmlFor="deadline">
                                                Deadline (Optional)
                                            </Label>
                                            <Input
                                                id="deadline"
                                                type="date"
                                                value={taskForm.deadline}
                                                onChange={(e) =>
                                                    setTaskForm({
                                                        ...taskForm,
                                                        deadline:
                                                            e.target.value,
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
                                                createTaskMutation.isPending
                                            }>
                                            {createTaskMutation.isPending
                                                ? "Creating..."
                                                : "Create Task"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Card
                                className="cursor-pointer hover-elevate active-elevate-2"
                                onClick={() =>
                                    document
                                        .querySelector("#reports-section")
                                        ?.scrollIntoView({ behavior: "smooth" })
                                }
                                data-testid="card-view-reports">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <FileText className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">
                                            View All Reports
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Access submitted reports
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <a href="#users" className="block">
                                <Card
                                    className="cursor-pointer hover-elevate active-elevate-2"
                                    data-testid="card-manage-users">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">
                                                Manage Users
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                View and rate users
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </a>
                        </div>

                        {/* Tasks Section */}
                        <Card id="tasks">
                            <CardHeader>
                                <CardTitle>All Tasks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {tasksLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : allTasks.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Task
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Assigned To
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Priority
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Status
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Deadline
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold">
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
                                                                <div className="font-medium">
                                                                    {task.title}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {task.description ||
                                                                        "—"}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-sm">
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
                                                                    }>
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
                                                                    }>
                                                                    {
                                                                        task.status
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4 text-sm font-mono text-xs">
                                                                {task.deadline
                                                                    ? format(
                                                                          new Date(
                                                                              task.deadline
                                                                          ),
                                                                          "MMM dd, yyyy"
                                                                      )
                                                                    : "—"}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    data-testid={`button-view-task-${task.id}`}>
                                                                    View
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No tasks created yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Users Section */}
                        <Card id="users">
                            <CardHeader>
                                <CardTitle>All Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {usersLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : users.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {users.map((user) => (
                                            <Card
                                                key={user.id}
                                                data-testid={`card-user-${user.id}`}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Avatar>
                                                            <AvatarImage
                                                                src={
                                                                    user.photoURL ||
                                                                    ""
                                                                }
                                                            />
                                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                                {user.displayName
                                                                    .split(" ")
                                                                    .map(
                                                                        (n) =>
                                                                            n[0]
                                                                    )
                                                                    .join("")
                                                                    .toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold">
                                                                {
                                                                    user.displayName
                                                                }
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Badge
                                                            variant={
                                                                user.role ===
                                                                "admin"
                                                                    ? "default"
                                                                    : "secondary"
                                                            }>
                                                            {user.role}
                                                        </Badge>
                                                        {user.role !==
                                                            "admin" && (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    data-testid={`button-rate-user-${user.id}`}
                                                                    onClick={() => {
                                                                        setRatingForm(
                                                                            {
                                                                                ...ratingForm,
                                                                                userId: user.id.toString(),
                                                                            }
                                                                        );
                                                                        setRatingDialogOpen(
                                                                            true
                                                                        );
                                                                    }}>
                                                                    Rate
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:text-destructive"
                                                                    data-testid={`button-remove-user-${user.id}`}
                                                                    onClick={() =>
                                                                        deleteUserMutation.mutate(
                                                                            user.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        deleteUserMutation.isPending
                                                                    }>
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Reports Table */}
                        <Card id="reports-section">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                    <CardTitle>User Reports</CardTitle>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Input
                                            type="date"
                                            value={dateFilter.startDate}
                                            onChange={(e) =>
                                                setDateFilter({
                                                    ...dateFilter,
                                                    startDate: e.target.value,
                                                })
                                            }
                                            className="w-full sm:w-40"
                                            placeholder="Start date"
                                            data-testid="input-start-date"
                                        />
                                        <Input
                                            type="date"
                                            value={dateFilter.endDate}
                                            onChange={(e) =>
                                                setDateFilter({
                                                    ...dateFilter,
                                                    endDate: e.target.value,
                                                })
                                            }
                                            className="w-full sm:w-40"
                                            placeholder="End date"
                                            data-testid="input-end-date"
                                        />
                                        <div className="relative w-full sm:w-auto">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by user..."
                                                className="pl-9 w-full sm:w-64"
                                                value={searchTerm}
                                                onChange={(e) =>
                                                    setSearchTerm(
                                                        e.target.value
                                                    )
                                                }
                                                data-testid="input-search-reports"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {reportsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : filteredReports.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        User
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Type
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Date
                                                    </th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold">
                                                        Tasks
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredReports.map(
                                                    (report, index) => (
                                                        <tr
                                                            key={report.id}
                                                            className={`border-b ${
                                                                index % 2 === 0
                                                                    ? "bg-card"
                                                                    : "bg-muted/20"
                                                            } hover-elevate`}
                                                            data-testid={`row-report-${report.id}`}>
                                                            <td className="py-3 px-4 text-sm">
                                                                {getUserNameById(
                                                                    report.userId
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-sm capitalize">
                                                                {
                                                                    report.reportType
                                                                }
                                                            </td>
                                                            <td className="py-3 px-4 text-sm font-mono text-xs">
                                                                {format(
                                                                    new Date(
                                                                        report.createdAt
                                                                    ),
                                                                    "MMM dd, yyyy"
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-xs">
                                                                {report.plannedTasks ||
                                                                    report.completedTasks ||
                                                                    "—"}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleViewReport(
                                                                            report
                                                                        )
                                                                    }
                                                                    data-testid={`button-view-report-${report.id}`}>
                                                                    View
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No reports found
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Messaging Section */}
                        <Card id="messages">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Communication Center
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="private" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger
                                            value="private"
                                            data-testid="tab-private-messages">
                                            Private Messages
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="announcements"
                                            data-testid="tab-announcements">
                                            Announcements
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="private"
                                        className="space-y-4 mt-4">
                                        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                            <h3 className="font-semibold">
                                                Send Private Message
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="message-user">
                                                        Select User
                                                    </Label>
                                                    <Select
                                                        value={
                                                            privateMessageForm.receiverId
                                                        }
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            setPrivateMessageForm(
                                                                {
                                                                    ...privateMessageForm,
                                                                    receiverId:
                                                                        value,
                                                                }
                                                            )
                                                        }>
                                                        <SelectTrigger
                                                            id="message-user"
                                                            data-testid="select-message-user">
                                                            <SelectValue placeholder="Choose a user" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users
                                                                .filter(
                                                                    (u) =>
                                                                        u.role ===
                                                                        "user"
                                                                )
                                                                .map((user) => (
                                                                    <SelectItem
                                                                        key={
                                                                            user.id
                                                                        }
                                                                        value={user.id.toString()}>
                                                                        {
                                                                            user.displayName
                                                                        }
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="private-message">
                                                        Message
                                                    </Label>
                                                    <Textarea
                                                        id="private-message"
                                                        placeholder="Type your message..."
                                                        value={
                                                            privateMessageForm.message
                                                        }
                                                        onChange={(e) =>
                                                            setPrivateMessageForm(
                                                                {
                                                                    ...privateMessageForm,
                                                                    message:
                                                                        e.target
                                                                            .value,
                                                                }
                                                            )
                                                        }
                                                        data-testid="textarea-private-message"
                                                        rows={4}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        sendPrivateMessageMutation.mutate(
                                                            privateMessageForm
                                                        )
                                                    }
                                                    disabled={
                                                        !privateMessageForm.receiverId ||
                                                        !privateMessageForm.message ||
                                                        sendPrivateMessageMutation.isPending
                                                    }
                                                    data-testid="button-send-private-message"
                                                    className="w-full">
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {sendPrivateMessageMutation.isPending
                                                        ? "Sending..."
                                                        : "Send Message"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="font-semibold">
                                                Recent Messages
                                            </h3>
                                            <div className="space-y-2">
                                                {privateMessages
                                                    .slice(0, 5)
                                                    .map((msg) => (
                                                        <div
                                                            key={msg.id}
                                                            className="bg-card border rounded-lg p-3"
                                                            data-testid={`message-${msg.id}`}>
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-sm font-medium">
                                                                            {getUserNameById(
                                                                                msg.senderId
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            →
                                                                        </span>
                                                                        <span className="text-sm font-medium">
                                                                            {getUserNameById(
                                                                                msg.receiverId
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {
                                                                            msg.message
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {format(
                                                                        new Date(
                                                                            msg.createdAt
                                                                        ),
                                                                        "MMM dd, HH:mm"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                {privateMessages.length ===
                                                    0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        No messages yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="announcements"
                                        className="space-y-4 mt-4">
                                        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                            <h3 className="font-semibold">
                                                Send Announcement (All Users)
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor="announcement-title">
                                                        Title (Optional)
                                                    </Label>
                                                    <Input
                                                        id="announcement-title"
                                                        placeholder="Announcement title..."
                                                        value={
                                                            groupMessageForm.title
                                                        }
                                                        onChange={(e) =>
                                                            setGroupMessageForm(
                                                                {
                                                                    ...groupMessageForm,
                                                                    title: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        data-testid="input-announcement-title"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="announcement-message">
                                                        Message
                                                    </Label>
                                                    <Textarea
                                                        id="announcement-message"
                                                        placeholder="Type your announcement..."
                                                        value={
                                                            groupMessageForm.message
                                                        }
                                                        onChange={(e) =>
                                                            setGroupMessageForm(
                                                                {
                                                                    ...groupMessageForm,
                                                                    message:
                                                                        e.target
                                                                            .value,
                                                                }
                                                            )
                                                        }
                                                        data-testid="textarea-announcement-message"
                                                        rows={4}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        sendGroupMessageMutation.mutate(
                                                            groupMessageForm
                                                        )
                                                    }
                                                    disabled={
                                                        !groupMessageForm.message ||
                                                        sendGroupMessageMutation.isPending
                                                    }
                                                    data-testid="button-send-announcement"
                                                    className="w-full">
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {sendGroupMessageMutation.isPending
                                                        ? "Sending..."
                                                        : "Send to All Users"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="font-semibold">
                                                Recent Announcements
                                            </h3>
                                            <div className="space-y-2">
                                                {groupMessages
                                                    .slice(0, 5)
                                                    .map((msg) => (
                                                        <div
                                                            key={msg.id}
                                                            className="bg-card border rounded-lg p-4"
                                                            data-testid={`announcement-${msg.id}`}>
                                                            {msg.title && (
                                                                <h4 className="font-semibold mb-2">
                                                                    {msg.title}
                                                                </h4>
                                                            )}
                                                            <p className="text-sm text-muted-foreground mb-2">
                                                                {msg.message}
                                                            </p>
                                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                <span>
                                                                    From:{" "}
                                                                    {getUserNameById(
                                                                        msg.senderId
                                                                    )}
                                                                </span>
                                                                <span className="font-mono">
                                                                    {format(
                                                                        new Date(
                                                                            msg.createdAt
                                                                        ),
                                                                        "MMM dd, yyyy HH:mm"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                {groupMessages.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        No announcements yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>

            {/* Report Detail Dialog */}
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Report Details</DialogTitle>
                        <DialogDescription>
                            {selectedReport &&
                                `${
                                    selectedReport.reportType
                                        .charAt(0)
                                        .toUpperCase() +
                                    selectedReport.reportType.slice(1)
                                } report by ${getUserNameById(
                                    selectedReport.userId
                                )}`}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold text-muted-foreground">
                                        User
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={
                                                    users.find(
                                                        (u) =>
                                                            u.id ===
                                                            selectedReport.userId
                                                    )?.photoURL || ""
                                                }
                                            />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                                {getUserNameById(
                                                    selectedReport.userId
                                                )
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">
                                            {getUserNameById(
                                                selectedReport.userId
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-muted-foreground">
                                        Report Type
                                    </Label>
                                    <p className="mt-1 capitalize">
                                        <Badge variant="outline">
                                            {selectedReport.reportType}
                                        </Badge>
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-muted-foreground">
                                        Submitted Date
                                    </Label>
                                    <p className="mt-1 text-sm font-mono">
                                        {format(
                                            new Date(selectedReport.createdAt),
                                            "PPP 'at' p"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-muted-foreground">
                                        Report ID
                                    </Label>
                                    <p className="mt-1 text-sm font-mono">
                                        #{selectedReport.id}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {selectedReport.plannedTasks && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-muted-foreground">
                                                Planned Tasks
                                            </Label>
                                            <div className="bg-muted/50 p-3 rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {
                                                        selectedReport.plannedTasks
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedReport.completedTasks && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-muted-foreground">
                                                Completed Tasks
                                            </Label>
                                            <div className="bg-muted/50 p-3 rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {
                                                        selectedReport.completedTasks
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedReport.pendingTasks && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-muted-foreground">
                                                Pending Tasks
                                            </Label>
                                            <div className="bg-muted/50 p-3 rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {
                                                        selectedReport.pendingTasks
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedReport.notes && (
                                <div className="border-t pt-4">
                                    <Label className="text-sm font-semibold text-muted-foreground">
                                        Additional Notes
                                    </Label>
                                    <div className="mt-2 bg-muted/50 p-4 rounded-lg">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {selectedReport.notes}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rating Dialog */}
            <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rate User</DialogTitle>
                        <DialogDescription>
                            Provide feedback and rating for the selected user
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rating-period">Period</Label>
                            <Select
                                value={ratingForm.period}
                                onValueChange={(value) =>
                                    setRatingForm({
                                        ...ratingForm,
                                        period: value,
                                    })
                                }>
                                <SelectTrigger
                                    id="rating-period"
                                    data-testid="select-rating-period">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">
                                        Weekly
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                        Monthly
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rating-value">Rating</Label>
                            <Select
                                value={ratingForm.rating}
                                onValueChange={(value) =>
                                    setRatingForm({
                                        ...ratingForm,
                                        rating: value,
                                    })
                                }>
                                <SelectTrigger
                                    id="rating-value"
                                    data-testid="select-rating-value">
                                    <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Excellent">
                                        ⭐⭐⭐⭐⭐ Excellent
                                    </SelectItem>
                                    <SelectItem value="Very Good">
                                        ⭐⭐⭐⭐ Very Good
                                    </SelectItem>
                                    <SelectItem value="Good">
                                        ⭐⭐⭐ Good
                                    </SelectItem>
                                    <SelectItem value="Average">
                                        ⭐⭐ Average
                                    </SelectItem>
                                    <SelectItem value="Needs Improvement">
                                        ⭐ Needs Improvement
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rating-feedback">
                                Feedback (Optional)
                            </Label>
                            <Textarea
                                id="rating-feedback"
                                placeholder="Provide additional feedback..."
                                value={ratingForm.feedback}
                                onChange={(e) =>
                                    setRatingForm({
                                        ...ratingForm,
                                        feedback: e.target.value,
                                    })
                                }
                                data-testid="textarea-rating-feedback"
                                rows={4}
                            />
                        </div>
                        <Button
                            onClick={() =>
                                createRatingMutation.mutate(ratingForm)
                            }
                            disabled={
                                !ratingForm.userId ||
                                !ratingForm.rating ||
                                createRatingMutation.isPending
                            }
                            data-testid="button-submit-rating"
                            className="w-full">
                            {createRatingMutation.isPending
                                ? "Submitting..."
                                : "Submit Rating"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
