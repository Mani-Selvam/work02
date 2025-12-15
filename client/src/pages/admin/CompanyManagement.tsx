import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    Users,
    UserCog,
    Plus,
    Save,
    ShoppingCart,
    Loader2,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { useState } from "react";
import type { SlotPricing } from "@shared/schema";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";

interface CompanyData {
    id: number;
    name: string;
    maxAdmins: number;
    maxMembers: number;
    currentAdmins: number;
    currentMembers: number;
    isActive: boolean;
}

const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
const stripePromise = loadStripe(publicKey);

export default function CompanyManagement() {
    const { dbUserId, userRole } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        maxAdmins: 1,
        maxMembers: 10,
    });
    const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({
        slotType: "admin" as "admin" | "member",
        quantity: 1,
    });
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<
        "idle" | "confirming" | "creating" | "processing" | "success" | "failed"
    >("idle");
    const [clientSecret, setClientSecret] = useState<string>("");
    const [paymentId, setPaymentId] = useState<number | null>(null);

    const { data: company, isLoading } = useQuery<CompanyData>({
        queryKey: ["/api/my-company"],
        enabled: !!dbUserId,
    });

    const { data: slotPricing } = useQuery<SlotPricing[]>({
        queryKey: ["/api/slot-pricing"],
    });

    const updateCompanyMutation = useMutation({
        mutationFn: async (updates: {
            name?: string;
            maxAdmins?: number;
            maxMembers?: number;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/my-company`,
                "PATCH",
                updates
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company"],
            });
            toast({
                title: "Success",
                description: "Company settings updated successfully",
            });
            setIsEditing(false);
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.message || "Failed to update company settings",
            });
        },
    });

    const createPaymentIntentMutation = useMutation({
        mutationFn: async (data: {
            slotType: "admin" | "member";
            quantity: number;
        }) => {
            setPaymentStatus("creating");
            const response = await apiRequest(
                `${API_BASE_URL}/api/create-payment-intent`,
                "POST",
                data
            );
            return await response.json();
        },
        onSuccess: (data: any) => {
            console.log("Payment intent created:", data);
            setClientSecret(data.clientSecret);
            setPaymentId(data.paymentId);
            setPaymentStatus("processing");
            setConfirmDialogOpen(false);
            console.log(
                "Payment status set to processing, clientSecret:",
                data.clientSecret ? "exists" : "missing"
            );
            toast({
                title: "Payment form ready",
                description:
                    "Please enter your card details to complete the purchase",
            });
        },
        onError: (error: any) => {
            setPaymentStatus("failed");
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create payment",
            });
        },
    });

    const verifyPaymentMutation = useMutation({
        mutationFn: async (paymentIntentId: string) => {
            const response = await apiRequest(
                `${API_BASE_URL}/api/verify-payment`,
                "POST",
                { paymentIntentId, paymentId }
            );
            return await response.json();
        },
        onSuccess: (data: any) => {
            setPaymentStatus("success");
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company-payments"],
            });

            const emailStatus = data.emailSent
                ? "✅ Receipt emailed to your company email"
                : "⚠️ Email sending in progress";

            toast({
                title: "🎉 Payment Successful!",
                description: `Receipt: ${data.receiptNumber}. ${emailStatus}. Slots have been added to your account.`,
                duration: 5000,
            });
            setTimeout(() => {
                setPurchaseDialogOpen(false);
                setPaymentStatus("idle");
                setClientSecret("");
                setPaymentId(null);
                setPurchaseForm({ slotType: "admin", quantity: 1 });
            }, 2000);
        },
        onError: (error: any) => {
            setPaymentStatus("failed");
            toast({
                variant: "destructive",
                title: "Payment Verification Failed",
                description: error.message || "Please contact support",
            });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                    No company data available
                </p>
            </div>
        );
    }

    const handleEdit = () => {
        setFormData({
            name: company.name,
            maxAdmins: company.maxAdmins,
            maxMembers: company.maxMembers,
        });
        setIsEditing(true);
    };

    const handleSave = () => {
        updateCompanyMutation.mutate(formData);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleOpenPurchaseDialog = (slotType: "admin" | "member") => {
        setPurchaseForm({ slotType, quantity: 1 });
        setPurchaseDialogOpen(true);
    };

    const handleInitiatePurchase = () => {
        setConfirmDialogOpen(true);
    };

    const handleConfirmPurchase = () => {
        createPaymentIntentMutation.mutate(purchaseForm);
    };

    const handlePaymentSuccess = (paymentIntentId: string) => {
        verifyPaymentMutation.mutate(paymentIntentId);
    };

    const handlePaymentFailure = () => {
        setPaymentStatus("failed");
    };

    const handleRetryPayment = () => {
        setPaymentStatus("idle");
        setClientSecret("");
        setConfirmDialogOpen(true);
    };

    const getTotalPrice = () => {
        const pricing = slotPricing?.find(
            (p) => p.slotType === purchaseForm.slotType
        );
        return (pricing?.pricePerSlot || 0) * purchaseForm.quantity;
    };

    const adminSlotUsage = (company.currentAdmins / company.maxAdmins) * 100;
    const memberSlotUsage = (company.currentMembers / company.maxMembers) * 100;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Company Management</h2>
                <p className="text-muted-foreground mt-1">
                    Manage your company settings and member slots
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Company Info Card */}
                <Card data-testid="card-company-info">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Company Information
                        </CardTitle>
                        <CardDescription>Basic company details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing ? (
                            <>
                                <div>
                                    <Label htmlFor="company-name">
                                        Company Name
                                    </Label>
                                    <Input
                                        id="company-name"
                                        data-testid="input-company-name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder="Enter company name"
                                    />
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <Button
                                        onClick={handleSave}
                                        disabled={
                                            updateCompanyMutation.isPending
                                        }
                                        data-testid="button-save-company">
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={
                                            updateCompanyMutation.isPending
                                        }
                                        data-testid="button-cancel-edit">
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Label className="text-muted-foreground">
                                        Company Name
                                    </Label>
                                    <p
                                        className="text-lg font-medium"
                                        data-testid="text-company-name">
                                        {company.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">
                                        Status
                                    </Label>
                                    <p
                                        className="text-lg font-medium"
                                        data-testid="text-company-status">
                                        {company.isActive
                                            ? "Active"
                                            : "Inactive"}
                                    </p>
                                </div>
                                {userRole === "company_admin" && (
                                    <Button
                                        onClick={handleEdit}
                                        variant="outline"
                                        className="mt-4"
                                        data-testid="button-edit-company">
                                        Edit Company
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Admin Slots Card */}
                <Card data-testid="card-admin-slots">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5" />
                            Admin Slots
                        </CardTitle>
                        <CardDescription>
                            Manage administrator slots
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Current Usage</Label>
                                <span
                                    className="text-sm font-medium"
                                    data-testid="text-admin-usage">
                                    {company.currentAdmins} /{" "}
                                    {company.maxAdmins}
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(
                                            adminSlotUsage,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                        {isEditing && (
                            <div>
                                <Label htmlFor="max-admins">
                                    Maximum Admins
                                </Label>
                                <Input
                                    id="max-admins"
                                    type="number"
                                    min="1"
                                    data-testid="input-max-admins"
                                    value={formData.maxAdmins}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            maxAdmins:
                                                parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                        )}
                        {!isEditing && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    handleOpenPurchaseDialog("admin")
                                }
                                data-testid="button-buy-admin-slots">
                                <Plus className="h-4 w-4 mr-2" />
                                Buy More Admin Slots
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Member Slots Card */}
                <Card data-testid="card-member-slots">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Member Slots
                        </CardTitle>
                        <CardDescription>Manage member slots</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Current Usage</Label>
                                <span
                                    className="text-sm font-medium"
                                    data-testid="text-member-usage">
                                    {company.currentMembers} /{" "}
                                    {company.maxMembers}
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(
                                            memberSlotUsage,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                        {isEditing && (
                            <div>
                                <Label htmlFor="max-members">
                                    Maximum Members
                                </Label>
                                <Input
                                    id="max-members"
                                    type="number"
                                    min="1"
                                    data-testid="input-max-members"
                                    value={formData.maxMembers}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            maxMembers:
                                                parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                        )}
                        {!isEditing && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    handleOpenPurchaseDialog("member")
                                }
                                data-testid="button-buy-member-slots">
                                <Plus className="h-4 w-4 mr-2" />
                                Buy More Member Slots
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Card */}
                <Card data-testid="card-summary">
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                        <CardDescription>
                            Overall slot availability
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                            <span className="text-sm">
                                Available Admin Slots
                            </span>
                            <span
                                className="font-semibold"
                                data-testid="text-available-admin-slots">
                                {company.maxAdmins - company.currentAdmins}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                            <span className="text-sm">
                                Available Member Slots
                            </span>
                            <span
                                className="font-semibold"
                                data-testid="text-available-member-slots">
                                {company.maxMembers - company.currentMembers}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                            <span className="text-sm font-medium">
                                Total Capacity
                            </span>
                            <span
                                className="font-bold"
                                data-testid="text-total-capacity">
                                {company.currentAdmins + company.currentMembers}{" "}
                                / {company.maxAdmins + company.maxMembers}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Slot Purchase Dialog */}
            <Dialog
                open={purchaseDialogOpen}
                onOpenChange={setPurchaseDialogOpen}>
                <DialogContent
                    data-testid="dialog-purchase-slots"
                    className="max-w-md max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Purchase Slots
                        </DialogTitle>
                        <DialogDescription>
                            Buy additional slots for your company
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {/* Pricing Info */}
                        {slotPricing && slotPricing.length > 0 && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                                <p className="text-sm font-medium text-primary">
                                    Current Slot Rates:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">
                                            Admin Slot:
                                        </span>
                                        <span
                                            className="font-semibold ml-1"
                                            data-testid="text-admin-rate">
                                            ₹
                                            {slotPricing.find(
                                                (p) => p.slotType === "admin"
                                            )?.pricePerSlot || 0}
                                            /slot
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            Member Slot:
                                        </span>
                                        <span
                                            className="font-semibold ml-1"
                                            data-testid="text-member-rate">
                                            ₹
                                            {slotPricing.find(
                                                (p) => p.slotType === "member"
                                            )?.pricePerSlot || 0}
                                            /slot
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="slot-type">Slot Type</Label>
                            <Select
                                value={purchaseForm.slotType}
                                onValueChange={(value: "admin" | "member") =>
                                    setPurchaseForm({
                                        ...purchaseForm,
                                        slotType: value,
                                    })
                                }>
                                <SelectTrigger data-testid="select-slot-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        Admin Slots
                                    </SelectItem>
                                    <SelectItem value="member">
                                        Member Slots
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={purchaseForm.quantity}
                                onChange={(e) =>
                                    setPurchaseForm({
                                        ...purchaseForm,
                                        quantity: parseInt(e.target.value) || 1,
                                    })
                                }
                                data-testid="input-slot-quantity"
                            />
                        </div>
                        <div className="border rounded-lg p-4 bg-secondary/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">
                                    Price per slot
                                </span>
                                <span
                                    className="font-medium"
                                    data-testid="text-price-per-slot">
                                    ₹
                                    {slotPricing?.find(
                                        (p) =>
                                            p.slotType === purchaseForm.slotType
                                    )?.pricePerSlot || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">
                                    Quantity
                                </span>
                                <span
                                    className="font-medium"
                                    data-testid="text-quantity">
                                    {purchaseForm.quantity}
                                </span>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">
                                        Total Amount
                                    </span>
                                    <span
                                        className="text-2xl font-bold text-primary"
                                        data-testid="text-total-amount">
                                        ₹{getTotalPrice()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Payment Status Display */}
                        {paymentStatus === "idle" && (
                            <Button
                                className="w-full"
                                onClick={handleInitiatePurchase}
                                disabled={
                                    !slotPricing || slotPricing.length === 0
                                }
                                data-testid="button-confirm-purchase">
                                Proceed to Payment
                            </Button>
                        )}

                        {paymentStatus === "processing" && clientSecret && (
                            <div data-testid="stripe-payment-container">
                                <Elements
                                    stripe={stripePromise}
                                    options={{ clientSecret }}>
                                    <StripeCheckoutForm
                                        onSuccess={handlePaymentSuccess}
                                        onFailure={handlePaymentFailure}
                                        amount={getTotalPrice()}
                                        clientSecret={clientSecret}
                                    />
                                </Elements>
                            </div>
                        )}

                        {paymentStatus === "creating" && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3">
                                    Generating secure payment link...
                                </span>
                            </div>
                        )}

                        {paymentStatus === "success" && (
                            <div className="text-center py-8 space-y-4">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        🎉 Payment Successful!
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Transaction ID: {paymentId}
                                        <br />
                                        Amount: ₹{getTotalPrice()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {paymentStatus === "failed" && (
                            <div className="text-center py-8 space-y-4">
                                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        ⚠️ Payment Failed or Cancelled
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Your payment could not be processed.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleRetryPayment}
                                    variant="outline"
                                    className="w-full">
                                    🔁 Retry Payment
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog
                open={confirmDialogOpen}
                onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent data-testid="dialog-payment-confirmation">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to proceed with the payment of{" "}
                            <span className="font-bold text-primary">
                                ₹{getTotalPrice()}
                            </span>
                            ?
                            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                                <div className="flex justify-between mb-1">
                                    <span>Slot Type:</span>
                                    <span className="font-medium capitalize">
                                        {purchaseForm.slotType}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Quantity:</span>
                                    <span className="font-medium">
                                        {purchaseForm.quantity} slots
                                    </span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-payment">
                            ❌ Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmPurchase}
                            disabled={createPaymentIntentMutation.isPending}
                            data-testid="button-proceed-payment">
                            {createPaymentIntentMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Order...
                                </>
                            ) : (
                                "✅ Yes, Proceed"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
