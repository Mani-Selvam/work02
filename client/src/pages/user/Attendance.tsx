import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogIn, LogOut, Calendar, Award, FileText } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { AttendanceRecord, Reward } from "@shared/schema";

export default function Attendance() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayAttendance, isLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: rewards } = useQuery<Reward[]>({
    queryKey: ["/api/attendance/my-rewards"],
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/check-in`, "POST", {
        gpsLocation: null,
        deviceId: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Checked In Successfully",
        description: "Your attendance has been marked for today.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Unable to check in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/check-out`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Checked Out Successfully",
        description: "Your checkout time has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out Failed",
        description: error.message || "Unable to check out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markLeaveMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/mark-leave`, "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      setLeaveDialogOpen(false);
      setLeaveReason("");
      toast({
        title: "Leave Marked Successfully",
        description: "Your attendance has been marked as leave for today.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Mark Leave",
        description: error.message || "Unable to mark leave. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMarkLeave = () => {
    if (leaveReason.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Reason must be at least 10 characters long.",
        variant: "destructive",
      });
      return;
    }
    markLeaveMutation.mutate(leaveReason);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      present: { variant: "default", label: "Present" },
      absent: { variant: "destructive", label: "Absent" },
      late: { variant: "secondary", label: "Late" },
      leave: { variant: "outline", label: "On Leave" },
    };
    const config = variants[status] || variants.absent;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalRewardPoints = rewards?.reduce((sum, r) => sum + r.points, 0) || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Track your daily attendance and view your records
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-mono">{format(currentTime, "HH:mm:ss")}</span>
              </div>
              {todayAttendance && getStatusBadge(todayAttendance.status)}
            </div>

            {todayAttendance && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Check-In</p>
                  <p className="text-lg font-medium" data-testid="text-checkin-time">
                    {todayAttendance.checkIn
                      ? format(new Date(todayAttendance.checkIn), "hh:mm a")
                      : "Not checked in"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-Out</p>
                  <p className="text-lg font-medium" data-testid="text-checkout-time">
                    {todayAttendance.checkOut
                      ? format(new Date(todayAttendance.checkOut), "hh:mm a")
                      : "Not checked out"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-lg font-medium" data-testid="text-duration">
                    {formatDuration(todayAttendance.workDuration)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!todayAttendance?.checkIn && !todayAttendance?.status && (
                <>
                  <Button
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    className="flex-1"
                    data-testid="button-checkin"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Check In
                  </Button>
                  <Button
                    onClick={() => setLeaveDialogOpen(true)}
                    disabled={markLeaveMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-mark-leave"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Mark as Leave
                  </Button>
                </>
              )}
              {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                <Button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-checkout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}
              {todayAttendance?.checkOut && (
                <div className="flex-1 p-3 text-center border rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    You have completed your attendance for today
                  </p>
                </div>
              )}
              {todayAttendance?.status === 'leave' && (
                <div className="flex-1 p-3 text-center border rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    You are marked as on leave for today
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Rewards
            </CardTitle>
            <CardDescription>Your attendance rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-6 border rounded-md bg-gradient-to-br from-primary/5 to-primary/10">
                <p className="text-3xl font-bold text-primary" data-testid="text-reward-points">
                  {totalRewardPoints}
                </p>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </div>
              {rewards && rewards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Rewards</p>
                  {rewards.slice(0, 3).map((reward) => (
                    <div
                      key={reward.id}
                      className="flex justify-between items-center p-2 border rounded-md"
                      data-testid={`reward-item-${reward.id}`}
                    >
                      <span className="text-sm">{reward.reason}</span>
                      <Badge variant="outline" className="text-primary">
                        +{reward.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Leave</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking today as leave. This will be visible to your admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your reason for leave (minimum 10 characters)..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-leave-reason"
            />
            <p className="text-sm text-muted-foreground">
              {leaveReason.length}/10 characters minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLeaveDialogOpen(false);
                setLeaveReason("");
              }}
              data-testid="button-cancel-leave"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkLeave}
              disabled={markLeaveMutation.isPending || leaveReason.trim().length < 10}
              data-testid="button-submit-leave"
            >
              {markLeaveMutation.isPending ? "Submitting..." : "Submit Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
