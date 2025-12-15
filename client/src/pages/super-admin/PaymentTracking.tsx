import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import type { CompanyPayment } from "@shared/schema";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

export default function PaymentTracking() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const queryParams = new URLSearchParams();
    if (startDate && endDate) {
        queryParams.append("startDate", startDate.toISOString());
        queryParams.append("endDate", endDate.toISOString());
    }
    if (statusFilter && statusFilter !== "all") {
        queryParams.append("status", statusFilter);
    }

    const {
        data: payments = [],
        isLoading,
        error,
    } = useQuery<CompanyPayment[]>({
        queryKey: ["/api/super-admin/payments", queryParams.toString()],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE_URL}/api/super-admin/payments?${queryParams}`,
                {
                    headers: {
                        "x-user-id": localStorage.getItem("userId") || "",
                    },
                }
            );
            if (!res.ok) {
                throw new Error("Failed to fetch payments");
            }
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
    });

    const getStatusBadge = (status: string) => {
        const variants = {
            paid: "default" as const,
            pending: "secondary" as const,
            failed: "destructive" as const,
            cancelled: "outline" as const,
        };
        return (
            <Badge
                variant={variants[status as keyof typeof variants] || "outline"}
                data-testid={`badge-status-${status}`}>
                {status}
            </Badge>
        );
    };

    const exportToCSV = () => {
        if (!payments || payments.length === 0) {
            return;
        }
        const headers = [
            "ID",
            "Company ID",
            "Amount",
            "Currency",
            "Status",
            "Payment Method",
            "Date",
        ];
        const rows = payments.map((p) => [
            p.id,
            p.companyId,
            p.amount,
            p.currency,
            p.paymentStatus,
            p.paymentMethod || "",
            format(new Date(p.createdAt), "yyyy-MM-dd HH:mm:ss"),
        ]);

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-destructive">
                            Error loading payments. Please try again later.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="container mx-auto p-6 space-y-6"
            data-testid="payment-tracking-page">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold" data-testid="page-title">
                        Payment Tracking
                    </h1>
                    <p className="text-muted-foreground">
                        Monitor all slot purchases and transactions
                    </p>
                </div>
                <Button onClick={exportToCSV} data-testid="button-export-csv">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Payments</CardTitle>
                    <CardDescription>
                        Search and filter payment transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}>
                                <SelectTrigger data-testid="select-status-filter">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="all"
                                        data-testid="select-option-all">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem
                                        value="paid"
                                        data-testid="select-option-paid">
                                        Paid
                                    </SelectItem>
                                    <SelectItem
                                        value="pending"
                                        data-testid="select-option-pending">
                                        Pending
                                    </SelectItem>
                                    <SelectItem
                                        value="failed"
                                        data-testid="select-option-failed">
                                        Failed
                                    </SelectItem>
                                    <SelectItem
                                        value="cancelled"
                                        data-testid="select-option-cancelled">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    data-testid="button-start-date">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate
                                        ? format(startDate, "PPP")
                                        : "Start date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    data-testid="button-end-date">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate
                                        ? format(endDate, "PPP")
                                        : "End date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Transactions</CardTitle>
                    <CardDescription>
                        Complete list of all payment transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead data-testid="header-id">
                                    ID
                                </TableHead>
                                <TableHead data-testid="header-company-id">
                                    Company ID
                                </TableHead>
                                <TableHead data-testid="header-amount">
                                    Amount
                                </TableHead>
                                <TableHead data-testid="header-slot-type">
                                    Slot Type
                                </TableHead>
                                <TableHead data-testid="header-quantity">
                                    Quantity
                                </TableHead>
                                <TableHead data-testid="header-status">
                                    Status
                                </TableHead>
                                <TableHead data-testid="header-payment-method">
                                    Payment Method
                                </TableHead>
                                <TableHead data-testid="header-date">
                                    Date
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow
                                    key={payment.id}
                                    data-testid={`row-payment-${payment.id}`}>
                                    <TableCell
                                        data-testid={`text-payment-id-${payment.id}`}>
                                        {payment.id}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-company-id-${payment.id}`}>
                                        {payment.companyId}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-amount-${payment.id}`}>
                                        {payment.currency} {payment.amount}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-slot-type-${payment.id}`}>
                                        {payment.slotType || "-"}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-quantity-${payment.id}`}>
                                        {payment.slotQuantity || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(payment.paymentStatus)}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-payment-method-${payment.id}`}>
                                        {payment.paymentMethod || "-"}
                                    </TableCell>
                                    <TableCell
                                        data-testid={`text-date-${payment.id}`}>
                                        {format(
                                            new Date(payment.createdAt),
                                            "MMM dd, yyyy HH:mm"
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {payments.length === 0 && (
                        <div className="text-center py-12">
                            <p
                                className="text-muted-foreground"
                                data-testid="text-no-payments">
                                No payments found
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
