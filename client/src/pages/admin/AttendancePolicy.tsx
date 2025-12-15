import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Clock, MapPin, Smartphone, Save } from "lucide-react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { AttendancePolicy } from "@shared/schema";

export default function AttendancePolicy() {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        halfDayHours: 4,
        fullDayHours: 8,
        lateMarkThreshold: 3,
        autoAbsentHours: 2,
        allowSelfCheckIn: true,
        requireGPS: false,
        requireDeviceBinding: false,
    });

    const { data: policy, isLoading } = useQuery<AttendancePolicy>({
        queryKey: ["/api/admin/attendance-policy"],
    });

    useEffect(() => {
        if (policy) {
            setFormData({
                halfDayHours: policy.halfDayHours,
                fullDayHours: policy.fullDayHours,
                lateMarkThreshold: policy.lateMarkThreshold,
                autoAbsentHours: policy.autoAbsentHours,
                allowSelfCheckIn: policy.allowSelfCheckIn,
                requireGPS: policy.requireGPS,
                requireDeviceBinding: policy.requireDeviceBinding,
            });
        }
    }, [policy]);

    const updatePolicyMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return await apiRequest(
                `${API_BASE_URL}/api/admin/attendance-policy`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/admin/attendance-policy"],
            });
            toast({
                title: "Policy Updated",
                description: "Attendance policy has been successfully updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Update Failed",
                description:
                    error.message ||
                    "Unable to update policy. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePolicyMutation.mutate(formData);
    };

    const handleReset = () => {
        if (policy) {
            setFormData({
                halfDayHours: policy.halfDayHours,
                fullDayHours: policy.fullDayHours,
                lateMarkThreshold: policy.lateMarkThreshold,
                autoAbsentHours: policy.autoAbsentHours,
                allowSelfCheckIn: policy.allowSelfCheckIn,
                requireGPS: policy.requireGPS,
                requireDeviceBinding: policy.requireDeviceBinding,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Attendance Policy Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Configure company-wide attendance rules and settings
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Work Hours Configuration
                        </CardTitle>
                        <CardDescription>
                            Define the standard working hours for your company
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="halfDayHours">
                                    Half Day Hours
                                </Label>
                                <Input
                                    id="halfDayHours"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={formData.halfDayHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            halfDayHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-half-day-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum hours required for half-day
                                    attendance
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullDayHours">
                                    Full Day Hours
                                </Label>
                                <Input
                                    id="fullDayHours"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={formData.fullDayHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            fullDayHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-full-day-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum hours required for full-day
                                    attendance
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lateMarkThreshold">
                                    Late Mark Threshold (minutes)
                                </Label>
                                <Input
                                    id="lateMarkThreshold"
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={formData.lateMarkThreshold}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            lateMarkThreshold: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-late-threshold"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Grace period before marking as late (in
                                    minutes)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autoAbsentHours">
                                    Auto Absent After (hours)
                                </Label>
                                <Input
                                    id="autoAbsentHours"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={formData.autoAbsentHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            autoAbsentHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-auto-absent-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mark as absent if work hours are less than
                                    this threshold
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Attendance Settings
                        </CardTitle>
                        <CardDescription>
                            Configure check-in/out behavior and security
                            settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="allowSelfCheckIn">
                                        Allow Self Check-In
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Enable employees to mark their own
                                    attendance
                                </p>
                            </div>
                            <Switch
                                id="allowSelfCheckIn"
                                checked={formData.allowSelfCheckIn}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        allowSelfCheckIn: checked,
                                    })
                                }
                                data-testid="switch-self-checkin"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="requireGPS">
                                        Require GPS Location
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Mandate GPS location when checking in/out
                                </p>
                            </div>
                            <Switch
                                id="requireGPS"
                                checked={formData.requireGPS}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        requireGPS: checked,
                                    })
                                }
                                data-testid="switch-require-gps"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="requireDeviceBinding">
                                        Require Device Binding
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Restrict attendance to registered devices
                                    only
                                </p>
                            </div>
                            <Switch
                                id="requireDeviceBinding"
                                checked={formData.requireDeviceBinding}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        requireDeviceBinding: checked,
                                    })
                                }
                                data-testid="switch-device-binding"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3 justify-end flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        data-testid="button-reset">
                        Reset Changes
                    </Button>
                    <Button
                        type="submit"
                        disabled={updatePolicyMutation.isPending}
                        data-testid="button-save-policy">
                        <Save className="w-4 h-4 mr-2" />
                        {updatePolicyMutation.isPending
                            ? "Saving..."
                            : "Save Policy"}
                    </Button>
                </div>
            </form>

            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base">
                        Policy Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Last Updated:
                        </span>
                        <span className="font-medium">
                            {policy?.updatedAt
                                ? new Date(policy.updatedAt).toLocaleString()
                                : "Never"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Policy ID:
                        </span>
                        <span className="font-medium">
                            #{policy?.id || "N/A"}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
