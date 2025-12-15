import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Clock } from "lucide-react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useState } from "react";
import type { Leave } from "@shared/schema";

const leaveFormSchema = z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    leaveType: z.string().min(1, "Leave type is required"),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

export default function LeaveManagement() {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: leaves = [], isLoading } = useQuery<Leave[]>({
        queryKey: ["/api/leaves/me"],
    });

    const form = useForm<LeaveFormData>({
        resolver: zodResolver(leaveFormSchema),
        defaultValues: {
            startDate: "",
            endDate: "",
            leaveType: "casual",
            reason: "",
        },
    });

    const createLeaveMutation = useMutation({
        mutationFn: async (data: LeaveFormData) => {
            return await apiRequest(`${API_BASE_URL}/api/leaves`, "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/leaves/me"],
            });
            toast({
                title: "Leave request submitted",
                description:
                    "Your leave request has been submitted for approval.",
            });
            form.reset();
            setDialogOpen(false);
        },
        onError: () => {
            toast({
                title: "Error",
                description:
                    "Failed to submit leave request. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: LeaveFormData) => {
        if (new Date(data.endDate) < new Date(data.startDate)) {
            toast({
                title: "Invalid dates",
                description: "End date cannot be before start date.",
                variant: "destructive",
            });
            return;
        }
        createLeaveMutation.mutate(data);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "rejected":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            default:
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Leave Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Request and manage your leaves
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button data-testid="button-request-leave">
                            <Plus className="h-4 w-4 mr-2" />
                            Request Leave
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request Leave</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    data-testid="input-start-date"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    data-testid="input-end-date"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="leaveType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Leave Type</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger data-testid="select-leave-type">
                                                        <SelectValue placeholder="Select leave type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="casual">
                                                        Casual Leave
                                                    </SelectItem>
                                                    <SelectItem value="sick">
                                                        Sick Leave
                                                    </SelectItem>
                                                    <SelectItem value="annual">
                                                        Annual Leave
                                                    </SelectItem>
                                                    <SelectItem value="emergency">
                                                        Emergency Leave
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reason</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    data-testid="input-reason"
                                                    placeholder="Please provide a reason for your leave request..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        data-testid="button-cancel">
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createLeaveMutation.isPending}
                                        data-testid="button-submit-leave">
                                        {createLeaveMutation.isPending
                                            ? "Submitting..."
                                            : "Submit Request"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {isLoading && (
                    <Card className="p-6">
                        <p className="text-center text-gray-500 dark:text-gray-400">
                            Loading...
                        </p>
                    </Card>
                )}

                {!isLoading && leaves.length === 0 && (
                    <Card className="p-6">
                        <p
                            className="text-center text-gray-500 dark:text-gray-400"
                            data-testid="text-no-leaves">
                            No leave requests yet. Click "Request Leave" to
                            submit your first request.
                        </p>
                    </Card>
                )}

                {leaves.map((leave: any) => (
                    <Card
                        key={leave.id}
                        className="p-6"
                        data-testid={`card-leave-${leave.id}`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3">
                                    <h3
                                        className="font-semibold text-lg capitalize"
                                        data-testid={`text-leave-type-${leave.id}`}>
                                        {leave.leaveType} Leave
                                    </h3>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                            leave.status
                                        )}`}
                                        data-testid={`status-leave-${leave.id}`}>
                                        {leave.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span
                                            data-testid={`text-dates-${leave.id}`}>
                                            {new Date(
                                                leave.startDate
                                            ).toLocaleDateString()}{" "}
                                            -{" "}
                                            {new Date(
                                                leave.endDate
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span
                                            data-testid={`text-applied-${leave.id}`}>
                                            Applied:{" "}
                                            {new Date(
                                                leave.appliedDate
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <p
                                    className="text-sm text-gray-700 dark:text-gray-300"
                                    data-testid={`text-reason-${leave.id}`}>
                                    <span className="font-medium">Reason:</span>{" "}
                                    {leave.reason}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
