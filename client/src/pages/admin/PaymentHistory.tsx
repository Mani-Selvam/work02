import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Receipt, Mail, CreditCard } from "lucide-react";
import { format } from "date-fns";
import type { CompanyPayment } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PaymentHistory() {
    const { dbUserId } = useAuth();

    const { data: payments = [], isLoading } = useQuery<CompanyPayment[]>({
        queryKey: ["/api/my-company-payments"],
        enabled: !!dbUserId,
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

    const handleDownloadReceipt = (payment: CompanyPayment) => {
        const receiptContent = `
WORKLOGIX - PAYMENT RECEIPT
===============================

Receipt Number: ${payment.receiptNumber}
Transaction ID: ${payment.transactionId}
Date: ${format(new Date(payment.createdAt), "PPP 'at' p")}

Company Details:
Company ID: ${payment.companyId}

Payment Details:
Slot Type: ${payment.slotType === "admin" ? "Admin Slots" : "Member Slots"}
Quantity: ${payment.slotQuantity}
Amount: ${
            payment.currency === "INR" ? "₹" : "$"
        }${payment.amount.toLocaleString()}
Payment Method: ${payment.paymentMethod || "Stripe"}
Status: ${payment.paymentStatus}

===============================
Thank you for your purchase!

For support, contact: support@worklogix.com
`;

        const blob = new Blob([receiptContent], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Receipt-${payment.receiptNumber}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const totalSpent = payments
        .filter((p) => p.paymentStatus === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

    const successfulPayments = payments.filter(
        (p) => p.paymentStatus === "paid"
    ).length;

    return (
        <div className="space-y-6" data-testid="page-payment-history">
            <div>
                <h1
                    className="text-3xl font-bold mb-2"
                    data-testid="heading-payment-history">
                    Payment History
                </h1>
                <p
                    className="text-muted-foreground"
                    data-testid="text-description">
                    View all your payment transactions and download receipts
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card data-testid="card-total-spent">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Spent
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-spent">
                            ₹{totalSpent.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All time spending
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-successful-payments">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Successful Payments
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-successful-count">
                            {successfulPayments}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Completed transactions
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-total-transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Transactions
                        </CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-transactions">
                            {payments.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All payment attempts
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card data-testid="card-payment-table">
                <CardHeader>
                    <CardTitle data-testid="heading-transaction-history">
                        Transaction History
                    </CardTitle>
                    <CardDescription data-testid="text-transaction-description">
                        Complete list of all your payment transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <div
                            className="text-center py-12"
                            data-testid="text-no-payments">
                            <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                No Payments Yet
                            </h3>
                            <p className="text-muted-foreground">
                                Your payment history will appear here once you
                                make a purchase
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead data-testid="header-date">
                                            Date
                                        </TableHead>
                                        <TableHead data-testid="header-receipt">
                                            Receipt Number
                                        </TableHead>
                                        <TableHead data-testid="header-description">
                                            Description
                                        </TableHead>
                                        <TableHead data-testid="header-amount">
                                            Amount
                                        </TableHead>
                                        <TableHead data-testid="header-status">
                                            Status
                                        </TableHead>
                                        <TableHead data-testid="header-email">
                                            Email
                                        </TableHead>
                                        <TableHead data-testid="header-actions">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow
                                            key={payment.id}
                                            data-testid={`row-payment-${payment.id}`}>
                                            <TableCell
                                                data-testid={`cell-date-${payment.id}`}>
                                                {format(
                                                    new Date(payment.createdAt),
                                                    "MMM dd, yyyy"
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {format(
                                                        new Date(
                                                            payment.createdAt
                                                        ),
                                                        "hh:mm a"
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-receipt-${payment.id}`}>
                                                <div className="font-mono text-sm">
                                                    {payment.receiptNumber ||
                                                        "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-description-${payment.id}`}>
                                                <div className="font-medium">
                                                    {payment.slotType ===
                                                    "admin"
                                                        ? "Admin Slots"
                                                        : "Member Slots"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Quantity:{" "}
                                                    {payment.slotQuantity}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-amount-${payment.id}`}>
                                                <div className="font-semibold">
                                                    ₹
                                                    {payment.amount.toLocaleString()}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-status-${payment.id}`}>
                                                {getStatusBadge(
                                                    payment.paymentStatus
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-email-${payment.id}`}>
                                                {payment.emailSent ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-green-50 text-green-700 border-green-200"
                                                        data-testid={`badge-email-sent-${payment.id}`}>
                                                        <Mail className="w-3 h-3 mr-1" />
                                                        Sent
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-gray-50 text-gray-600"
                                                        data-testid={`badge-email-not-sent-${payment.id}`}>
                                                        Not Sent
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-testid={`cell-actions-${payment.id}`}>
                                                {payment.paymentStatus ===
                                                    "paid" &&
                                                    payment.receiptNumber && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDownloadReceipt(
                                                                    payment
                                                                )
                                                            }
                                                            data-testid={`button-download-receipt-${payment.id}`}>
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Receipt
                                                        </Button>
                                                    )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
