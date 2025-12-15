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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useState } from "react";
import type { Holiday } from "@shared/schema";

const holidayFormSchema = z.object({
    name: z.string().min(1, "Holiday name is required"),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
});

type HolidayFormData = z.infer<typeof holidayFormSchema>;

export default function HolidayManagement() {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: user } = useQuery<any>({
        queryKey: ["/api/me"],
    });

    const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
        queryKey: ["/api/holidays/company", user?.companyId],
        enabled: !!user?.companyId,
    });

    const form = useForm<HolidayFormData>({
        resolver: zodResolver(holidayFormSchema),
        defaultValues: {
            name: "",
            date: "",
            description: "",
        },
    });

    const createHolidayMutation = useMutation({
        mutationFn: async (data: HolidayFormData) => {
            return await apiRequest(
                `${API_BASE_URL}/api/holidays`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/holidays/company", user?.companyId],
            });
            toast({
                title: "Holiday added",
                description: "The holiday has been added successfully.",
            });
            form.reset();
            setDialogOpen(false);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to add holiday. Please try again.",
                variant: "destructive",
            });
        },
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: async (holidayId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/holidays/${holidayId}`,
                "DELETE",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/holidays/company", user?.companyId],
            });
            toast({
                title: "Holiday deleted",
                description: "The holiday has been removed successfully.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete holiday. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: HolidayFormData) => {
        createHolidayMutation.mutate(data);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Holiday Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage company holidays and days off
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button data-testid="button-add-holiday">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Holiday
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Holiday</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Holiday Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    data-testid="input-holiday-name"
                                                    placeholder="e.g., Christmas, New Year"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    data-testid="input-holiday-date"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Description (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    data-testid="input-holiday-description"
                                                    placeholder="Additional details about the holiday..."
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
                                        disabled={
                                            createHolidayMutation.isPending
                                        }
                                        data-testid="button-submit-holiday">
                                        {createHolidayMutation.isPending
                                            ? "Adding..."
                                            : "Add Holiday"}
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

                {!isLoading && holidays.length === 0 && (
                    <Card className="p-6">
                        <p
                            className="text-center text-gray-500 dark:text-gray-400"
                            data-testid="text-no-holidays">
                            No holidays added yet. Click "Add Holiday" to create
                            your first holiday.
                        </p>
                    </Card>
                )}

                {holidays.map((holiday) => (
                    <Card
                        key={holiday.id}
                        className="p-6"
                        data-testid={`card-holiday-${holiday.id}`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <h3
                                    className="font-semibold text-lg"
                                    data-testid={`text-holiday-name-${holiday.id}`}>
                                    {holiday.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="h-4 w-4" />
                                    <span
                                        data-testid={`text-holiday-date-${holiday.id}`}>
                                        {new Date(
                                            holiday.date
                                        ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>
                                {holiday.description && (
                                    <p
                                        className="text-sm text-gray-700 dark:text-gray-300"
                                        data-testid={`text-holiday-description-${holiday.id}`}>
                                        {holiday.description}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() =>
                                    deleteHolidayMutation.mutate(holiday.id)
                                }
                                disabled={deleteHolidayMutation.isPending}
                                data-testid={`button-delete-${holiday.id}`}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
