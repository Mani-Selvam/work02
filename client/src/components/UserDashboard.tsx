import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Eye } from "lucide-react";
import TaskCard from "./TaskCard";
import MessageCard from "./MessageCard";
import RatingBadge from "./RatingBadge";
import TimeBasedForm from "./TimeBasedForm";
import ThemeToggle from "./ThemeToggle";
import heroImage from "@assets/stock_images/professional_team_co_b1c47478.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useCallback, useState } from "react";
import type { Task, Message, Rating, GroupMessage, Report } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function UserDashboard() {
  const { user, signOut, dbUserId } = useAuth();
  const [, setLocation] = useLocation();
  const [viewReportsOpen, setViewReportsOpen] = useState(false);
  const currentHour = new Date().getHours();
  const formType = currentHour >= 9 && currentHour < 12 ? "morning" : currentHour >= 18 && currentHour < 24 ? "evening" : null;

  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'USER_DELETED' && data.userId === dbUserId) {
      signOut();
      setLocation("/");
    }
  }, [dbUserId, signOut, setLocation]);

  useWebSocket(handleWebSocketMessage);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`${API_BASE_URL}/api/tasks`, dbUserId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/tasks?userId=${dbUserId}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!dbUserId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`${API_BASE_URL}/api/messages`, dbUserId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/messages?receiverId=${dbUserId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!dbUserId,
  });

  const { data: latestRating, isLoading: ratingLoading } = useQuery<Rating | null>({
    queryKey: [`${API_BASE_URL}/api/ratings`, dbUserId, 'latest'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/ratings?userId=${dbUserId}&latest=true`);
      if (!res.ok) throw new Error('Failed to fetch rating');
      return res.json();
    },
    enabled: !!dbUserId,
  });

  const { data: allRatings = [] } = useQuery<Rating[]>({
    queryKey: [`${API_BASE_URL}/api/ratings`, dbUserId, 'all'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/ratings?userId=${dbUserId}`);
      if (!res.ok) throw new Error('Failed to fetch ratings');
      return res.json();
    },
    enabled: !!dbUserId,
  });

  const { data: groupMessages = [] } = useQuery<GroupMessage[]>({
    queryKey: [`${API_BASE_URL}/api/group-messages`],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/group-messages?limit=10`);
      if (!res.ok) throw new Error('Failed to fetch announcements');
      return res.json();
    },
  });

  const { data: userReports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: [`${API_BASE_URL}/api/reports`, dbUserId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/reports?userId=${dbUserId}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    enabled: !!dbUserId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`${API_BASE_URL}/api/messages/${messageId}/read`, 'PATCH', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/messages`, dbUserId] });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await apiRequest(`${API_BASE_URL}/api/tasks/${taskId}/status`, 'PATCH', { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/tasks`, dbUserId] });
      await queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/tasks`] });
      await queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/api/dashboard/stats`] });
      await queryClient.refetchQueries({ queryKey: [`${API_BASE_URL}/api/dashboard/stats`] });
    },
  });

  const handleLogout = async () => {
    try {
      await signOut();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const markMessageAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const userName = user?.displayName || "User";
  const userEmail = user?.email || "";
  const userAvatar = user?.photoURL || "";
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const unreadCount = messages.filter(m => !m.readStatus).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">WorkLogix</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-3 pl-3 border-l">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <Avatar data-testid="avatar-user">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={heroImage}
          alt="Workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-primary/40 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-2">
              {formType === "morning" ? "Good Morning" : formType === "evening" ? "Good Evening" : "Welcome"} {userName.split(' ')[0]}!
            </h2>
            <p className="text-lg opacity-90">
              {formType === "morning"
                ? "Ready to plan your day?"
                : formType === "evening"
                ? "Time to log your progress"
                : "Let's get to work"}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                <span className="text-sm font-medium" data-testid="text-ratings-count">
                  ⭐ {allRatings.length} {allRatings.length === 1 ? 'Rating' : 'Ratings'} Received
                </span>
              </div>
              {latestRating && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full" data-testid="badge-latest-rating">
                  <span className="text-sm font-medium">
                    Latest: {latestRating.rating}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tasks and Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Time-based Form */}
            {formType && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Daily Report</h3>
                <TimeBasedForm type={formType} userName={userName.split(' ')[0]} userId={dbUserId} />
              </div>
            )}

            {/* View Reports Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">My Submitted Reports</h3>
                <Dialog open={viewReportsOpen} onOpenChange={setViewReportsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-view-reports">
                      <Eye className="h-4 w-4 mr-2" />
                      View All Reports ({userReports.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>My Submitted Reports</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {reportsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : userReports.length > 0 ? (
                        userReports.map((report) => (
                          <Card key={report.id} data-testid={`card-report-${report.id}`}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
                                </CardTitle>
                                <Badge variant="outline" data-testid={`badge-report-type-${report.id}`}>
                                  {format(new Date(report.createdAt), "PPpp")}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {report.plannedTasks && (
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Planned Tasks:</h4>
                                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-planned-${report.id}`}>{report.plannedTasks}</p>
                                </div>
                              )}
                              {report.completedTasks && (
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Completed Tasks:</h4>
                                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-completed-${report.id}`}>{report.completedTasks}</p>
                                </div>
                              )}
                              {report.pendingTasks && (
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Pending Tasks:</h4>
                                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-pending-${report.id}`}>{report.pendingTasks}</p>
                                </div>
                              )}
                              {report.notes && (
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Notes:</h4>
                                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-notes-${report.id}`}>{report.notes}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No reports submitted yet
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Assigned Tasks */}
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Assigned Tasks ({tasksLoading ? "..." : tasks.length})
              </h3>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map(task => {
                    const statusMap: Record<string, "Pending" | "In Progress" | "Completed"> = {
                      'pending': 'Pending',
                      'in progress': 'In Progress',
                      'completed': 'Completed'
                    };
                    const priorityMap: Record<string, "Low" | "Medium" | "High"> = {
                      'low': 'Low',
                      'medium': 'Medium',
                      'high': 'High'
                    };
                    return (
                      <TaskCard
                        key={task.id}
                        id={String(task.id)}
                        userId={dbUserId!}
                        title={task.title}
                        description={task.description || ""}
                        priority={priorityMap[task.priority.toLowerCase()] || 'Medium'}
                        deadline={task.deadline ? new Date(task.deadline) : undefined}
                        status={statusMap[task.status.toLowerCase()] || 'Pending'}
                        assignedDate={new Date(task.createdAt)}
                        onStatusChange={(status) => {
                          const dbStatus = status.toLowerCase();
                          updateTaskStatusMutation.mutate({ taskId: task.id, status: dbStatus });
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks assigned yet
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Messages and Ratings */}
          <div className="space-y-8">
            {/* Messages */}
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Messages ({messagesLoading ? "..." : `${unreadCount} unread`})
              </h3>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map(msg => (
                    <MessageCard
                      key={msg.id}
                      id={String(msg.id)}
                      message={msg.message}
                      timestamp={new Date(msg.createdAt)}
                      isRead={msg.readStatus}
                      relatedTask={msg.relatedTaskId ? `Task #${msg.relatedTaskId}` : undefined}
                      onMarkRead={() => markMessageAsRead(msg.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No messages
                </div>
              )}
            </div>

            {/* Ratings & Feedback */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Performance Feedback</h3>
              {ratingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : latestRating ? (
                <div className="space-y-4">
                  <RatingBadge
                    rating={latestRating.rating as "Excellent" | "Good" | "Needs Improvement"}
                    feedback={latestRating.feedback || ""}
                    timestamp={new Date(latestRating.createdAt)}
                    period={latestRating.period}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No ratings yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
