import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, Repeat2, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { Task } from "@shared/schema";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  timeLogs: {
    totalSeconds: number;
    oldTimeSeconds: number;
    newTimeSeconds: number;
  } | null;
  returnCount: number;
  reworkHistory?: Array<{
    date: string;
    message: string;
  }>;
}

export default function TaskDetailsModal({
  open,
  onOpenChange,
  task,
  timeLogs,
  returnCount,
  reworkHistory = [],
}: TaskDetailsModalProps) {
  if (!task) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const createdDate = new Date(task.createdAt);
  const completedDate = task.completedAt ? new Date(task.completedAt) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Task Details & History</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Task Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary-foreground">Priority</p>
                  <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
                    {task.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-secondary-foreground">Status</p>
                  <Badge variant={task.status === "completed" ? "default" : task.status === "returned" ? "destructive" : "outline"}>
                    {task.status}
                  </Badge>
                </div>
              </div>
              {task.description && (
                <div>
                  <p className="text-sm text-secondary-foreground">Description</p>
                  <p className="text-sm">{task.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeLogs ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">Total Time</span>
                      <span className="font-semibold">{formatTime(timeLogs.totalSeconds)}</span>
                    </div>
                    {timeLogs.oldTimeSeconds > 0 && (
                      <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <span className="text-sm">Previous Attempt</span>
                        <span className="font-semibold text-orange-700 dark:text-orange-300">{formatTime(timeLogs.oldTimeSeconds)}</span>
                      </div>
                    )}
                    {timeLogs.newTimeSeconds > 0 && (
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <span className="text-sm">Rework Time</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{formatTime(timeLogs.newTimeSeconds)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-secondary-foreground">No time logged</p>
              )}
            </CardContent>
          </Card>

          {/* Rework History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat2 className="w-4 h-4" />
                Rework History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reworkHistory && reworkHistory.length > 0 ? (
                <div className="space-y-2">
                  {reworkHistory.map((rework, index) => {
                    const reworkDate = new Date(rework.date);
                    return (
                      <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900/50">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Return to Pending</p>
                            <p className="text-xs text-secondary-foreground mt-1">
                              {format(reworkDate, "MMM dd, yyyy")} at {format(reworkDate, "hh:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-secondary-foreground mt-3">
                    Task returned {reworkHistory.length} time{reworkHistory.length > 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-secondary-foreground">No rework requests</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-secondary-foreground">Created</p>
                    <p className="text-sm font-medium">{format(createdDate, "MMM dd, yyyy")}</p>
                    <p className="text-xs text-secondary-foreground">{format(createdDate, "hh:mm a")}</p>
                  </div>
                </div>

                {task.deadline && (
                  <div className="flex justify-between items-start border-t pt-3">
                    <div>
                      <p className="text-sm text-secondary-foreground">Deadline</p>
                      <p className="text-sm font-medium">{format(new Date(task.deadline), "MMM dd, yyyy")}</p>
                      <p className="text-xs text-secondary-foreground">{format(new Date(task.deadline), "hh:mm a")}</p>
                    </div>
                  </div>
                )}

                {completedDate && (
                  <div className="flex justify-between items-start border-t pt-3">
                    <div>
                      <p className="text-sm text-secondary-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </p>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">{format(completedDate, "MMM dd, yyyy")}</p>
                      <p className="text-xs text-secondary-foreground">{format(completedDate, "hh:mm a")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
