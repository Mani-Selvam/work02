import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ChevronUp, Play, Pause, CheckCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/queryClient";

interface TaskCardProps {
  id: string;
  userId: number;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  deadline?: Date;
  status: "Pending" | "In Progress" | "Completed";
  assignedDate: Date;
  onStatusChange?: (status: "Pending" | "In Progress" | "Completed") => void;
}

const priorityColors = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  High: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function TaskCard({
  id,
  userId,
  title,
  description,
  priority,
  deadline,
  status,
  assignedDate,
  onStatusChange,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();
  
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: timeLog, refetch: refetchTimeLog } = useQuery({
    queryKey: [`${API_BASE_URL}/api/tasks/${id}/timer`, userId, today],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/timer?userId=${userId}&date=${today}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (timeLog?.timerStatus === 'running' && timeLog?.timerStartedAt) {
      const startTime = new Date(timeLog.timerStartedAt).getTime();
      const baseSeconds = timeLog.totalSeconds || 0;
      
      const timer = setInterval(() => {
        const now = Date.now();
        const additionalSeconds = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(baseSeconds + additionalSeconds);
      }, 1000);
      
      return () => clearInterval(timer);
    } else if (timeLog?.totalSeconds) {
      setElapsedSeconds(timeLog.totalSeconds);
    } else {
      setElapsedSeconds(0);
    }
  }, [timeLog]);

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/timer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today }),
      });
      if (!res.ok) throw new Error('Failed to start timer');
      return res.json();
    },
    onSuccess: () => {
      refetchTimeLog();
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/timer/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today }),
      });
      if (!res.ok) throw new Error('Failed to pause timer');
      return res.json();
    },
    onSuccess: () => {
      refetchTimeLog();
    },
  });

  const completeTimerMutation = useMutation({
    mutationFn: async () => {
      const timerRes = await fetch(`${API_BASE_URL}/api/tasks/${id}/timer/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: today }),
      });
      if (!timerRes.ok) throw new Error('Failed to complete timer');
      
      const statusRes = await fetch(`${API_BASE_URL}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!statusRes.ok) throw new Error('Failed to update task status');
      
      return timerRes.json();
    },
    onSuccess: () => {
      setCurrentStatus('Completed');
      onStatusChange?.('Completed');
      refetchTimeLog();
    },
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatusChange = () => {
    const statusFlow: Record<string, "Pending" | "In Progress" | "Completed"> = {
      Pending: "In Progress",
      "In Progress": "Completed",
      Completed: "Completed",
    };
    const newStatus = statusFlow[currentStatus];
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus);
    console.log(`Task ${id} status changed to ${newStatus}`);
  };

  return (
    <Card
      className={`border-l-4 ${
        priority === "High"
          ? "border-l-red-500"
          : priority === "Medium"
          ? "border-l-amber-500"
          : "border-l-muted-foreground"
      }`}
      data-testid={`card-task-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1 text-xs font-mono">
              Assigned {format(assignedDate, "MMM dd, yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={priorityColors[priority]} data-testid={`badge-priority-${id}`}>
              {priority}
            </Badge>
            <Badge className={statusColors[currentStatus]} data-testid={`badge-status-${id}`}>
              {currentStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-mono">Due: {format(deadline, "MMM dd, yyyy")}</span>
          </div>
        )}
        
        {expanded && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock className="h-4 w-4" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {timeLog?.timerStatus === 'completed' ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed Today
              </Badge>
            ) : (
              <>
                {timeLog?.timerStatus === 'running' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pauseTimerMutation.mutate()}
                    disabled={pauseTimerMutation.isPending}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startTimerMutation.mutate()}
                    disabled={startTimerMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => completeTimerMutation.mutate()}
                  disabled={completeTimerMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-${id}`}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                More
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
