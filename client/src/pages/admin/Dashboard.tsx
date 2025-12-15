import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import MetricCard from "@/components/MetricCard";
import {
    Users,
    FileText,
    CheckCircle,
    FolderOpen,
    Plus,
    MessageSquare,
    Building2,
    DollarSign,
    CreditCard,
    Edit,
    Trash2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTaskUpdates } from "@/hooks/useTaskUpdates";
import { useState } from "react";
import type { SlotPricing, CompanyPayment, Company } from "@shared/schema";

interface CompanyData {
    id: number;
    name: string;
    maxAdmins: number;
    maxMembers: number;
    currentAdmins: number;
    currentMembers: number;
    isActive: boolean;
}

export default function Dashboard() {
    useTaskUpdates();
    const [, setLocation] = useLocation();
    const { dbUserId, companyId, userRole } = useAuth();
    const { toast } = useToast();
    const [editingPricing, setEditingPricing] = useState<{
        slotType: string;
        price: string;
    } | null>(null);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(
        null
    );
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const isSuperAdmin = userRole === "super_admin";

    const { data: stats } = useQuery<{
        totalUsers: number;
        todayReports: number;
        pendingTasks: number;
        completedTasks: number;
        totalFiles: number;
        pendingCompletedTasks?: number;
    }>({
        queryKey: ["/api/dashboard/stats"],
    });

    const { data: company } = useQuery<CompanyData>({
        queryKey: ["/api/my-company"],
        enabled: !!companyId && !!dbUserId && !isSuperAdmin,
    });

    const { data: slotPricing } = useQuery<SlotPricing[]>({
        queryKey: ["/api/slot-pricing"],
        enabled: isSuperAdmin,
    });

    const { data: allCompanies } = useQuery<Company[]>({
        queryKey: ["/api/companies"],
        enabled: isSuperAdmin,
    });

    const { data: allPayments } = useQuery<CompanyPayment[]>({
        queryKey: ["/api/company-payments"],
        enabled: isSuperAdmin,
    });

    const updatePricingMutation = useMutation({
        mutationFn: async (data: {
            slotType: string;
            pricePerSlot: number;
            currency: string;
        }) => {
            return await apiRequest(
                `${API_BASE_URL}/api/slot-pricing`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/slot-pricing"] });
            toast({
                title: "Success",
                description: "Pricing updated successfully",
            });
            setEditingPricing(null);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update pricing",
                variant: "destructive",
            });
        },
    });

    const deleteCompanyMutation = useMutation({
        mutationFn: async (companyId: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/companies/${companyId}`,
                "DELETE"
            );
        },
        onMutate: async (companyId: number) => {
            await queryClient.cancelQueries({
                queryKey: [`${API_BASE_URL}/api/companies`],
            });

            const previousCompanies = queryClient.getQueryData<Company[]>([
                `${API_BASE_URL}/api/companies`,
            ]);

            queryClient.setQueryData<Company[]>(
                [`${API_BASE_URL}/api/companies`],
                (old) => (old ? old.filter((c) => c.id !== companyId) : [])
            );

            return { previousCompanies };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
            toast({
                title: "Success",
                description: "Company removed successfully",
            });
            setDeleteDialogOpen(false);
            setCompanyToDelete(null);
        },
        onError: (error: any, companyId, context) => {
            if (context?.previousCompanies) {
                queryClient.setQueryData(
                    [`${API_BASE_URL}/api/companies`],
                    context.previousCompanies
                );
            }
            toast({
                title: "Error",
                description: error.message || "Failed to remove company",
                variant: "destructive",
            });
        },
    });

    const handleSavePricing = () => {
        if (editingPricing) {
            updatePricingMutation.mutate({
                slotType: editingPricing.slotType,
                pricePerSlot: parseInt(editingPricing.price),
                currency: "INR",
            });
        }
    };

    const handleDeleteCompany = (company: Company) => {
        setCompanyToDelete(company);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteCompany = () => {
        if (companyToDelete) {
            deleteCompanyMutation.mutate(companyToDelete.id);
        }
    };

    const quickActions = [
        {
            icon: Plus,
            label: "Create Task",
            onClick: () => setLocation("/admin/tasks"),
        },
        {
            icon: MessageSquare,
            label: "Send Message",
            onClick: () => setLocation("/admin/messages"),
        },
        {
            icon: FileText,
            label: "View Reports",
            onClick: () => setLocation("/admin/reports"),
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                    Dashboard Overview
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Monitor your team's performance and activity
                </p>
            </div>

            {/* Company Info Banner - Company Admin Only */}
            {company && !isSuperAdmin && (
                <Card data-testid="card-company-banner">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3
                                    className="font-semibold text-lg"
                                    data-testid="text-dashboard-company-name">
                                    {company.name}
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">
                                            Admins:{" "}
                                        </span>
                                        <span
                                            className="font-medium"
                                            data-testid="text-dashboard-admin-count">
                                            {company.currentAdmins}/
                                            {company.maxAdmins}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            Members:{" "}
                                        </span>
                                        <span
                                            className="font-medium"
                                            data-testid="text-dashboard-member-count">
                                            {company.currentMembers}/
                                            {company.maxMembers}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            Total Capacity:{" "}
                                        </span>
                                        <span
                                            className="font-medium"
                                            data-testid="text-dashboard-total-capacity">
                                            {company.currentAdmins +
                                                company.currentMembers}
                                            /
                                            {company.maxAdmins +
                                                company.maxMembers}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Super Admin: Slot Pricing Management */}
            {isSuperAdmin && (
                <Card data-testid="card-slot-pricing">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Slot Pricing Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {["admin", "member"].map((slotType) => {
                                const pricing = slotPricing?.find(
                                    (p) => p.slotType === slotType
                                );
                                const isEditing =
                                    editingPricing?.slotType === slotType;

                                return (
                                    <div
                                        key={slotType}
                                        className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold capitalize">
                                                {slotType} Slot
                                            </h4>
                                            {!isEditing && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setEditingPricing({
                                                            slotType,
                                                            price:
                                                                pricing?.pricePerSlot?.toString() ||
                                                                "0",
                                                        })
                                                    }
                                                    data-testid={`button-edit-${slotType}-pricing`}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <Label>
                                                        Price per Slot (INR)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        value={
                                                            editingPricing.price
                                                        }
                                                        onChange={(e) =>
                                                            setEditingPricing({
                                                                ...editingPricing,
                                                                price: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        data-testid={`input-${slotType}-price`}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={
                                                            handleSavePricing
                                                        }
                                                        disabled={
                                                            updatePricingMutation.isPending
                                                        }
                                                        data-testid={`button-save-${slotType}-pricing`}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setEditingPricing(
                                                                null
                                                            )
                                                        }
                                                        data-testid={`button-cancel-${slotType}-pricing`}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="text-2xl font-bold text-primary"
                                                data-testid={`text-${slotType}-price`}>
                                                ₹{pricing?.pricePerSlot || 0}
                                                <span className="text-sm text-muted-foreground font-normal">
                                                    /slot
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Super Admin: Company Overview */}
            {isSuperAdmin && allCompanies && (
                <Card data-testid="card-companies-overview">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Companies Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {allCompanies.slice(0, 5).map((comp) => {
                                const companyPayments =
                                    allPayments?.filter(
                                        (p) =>
                                            p.companyId === comp.id &&
                                            p.paymentStatus === "paid"
                                    ) || [];
                                const adminSlotsPurchased = companyPayments
                                    .filter((p) => p.slotType === "admin")
                                    .reduce(
                                        (sum, p) => sum + (p.slotQuantity || 0),
                                        0
                                    );
                                const memberSlotsPurchased = companyPayments
                                    .filter((p) => p.slotType === "member")
                                    .reduce(
                                        (sum, p) => sum + (p.slotQuantity || 0),
                                        0
                                    );
                                const totalPaid = companyPayments.reduce(
                                    (sum, p) => sum + p.amount,
                                    0
                                );
                                const lastPurchaseDate =
                                    companyPayments.length > 0
                                        ? new Date(
                                              Math.max(
                                                  ...companyPayments.map((p) =>
                                                      new Date(
                                                          p.createdAt
                                                      ).getTime()
                                                  )
                                              )
                                          )
                                        : null;

                                return (
                                    <div
                                        key={comp.id}
                                        className="flex items-center justify-between p-3 border rounded-lg gap-3"
                                        data-testid={`company-${comp.id}`}>
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {comp.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {comp.serverId}
                                            </p>
                                            {companyPayments.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-xs text-muted-foreground">
                                                        Purchased:{" "}
                                                        {adminSlotsPurchased}{" "}
                                                        admin,{" "}
                                                        {memberSlotsPurchased}{" "}
                                                        member slots
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Total Paid: ₹{totalPaid}{" "}
                                                        | Last:{" "}
                                                        {lastPurchaseDate?.toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm">
                                                <span className="font-medium">
                                                    {comp.maxAdmins +
                                                        comp.maxMembers}
                                                </span>{" "}
                                                slots
                                            </p>
                                            <p
                                                className={`text-xs ${
                                                    comp.isActive
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}>
                                                {comp.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleDeleteCompany(comp)
                                            }
                                            disabled={
                                                deleteCompanyMutation.isPending
                                            }
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                            data-testid={`button-delete-company-${comp.id}`}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                            {allCompanies.length > 5 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() =>
                                        setLocation("/admin/company")
                                    }
                                    data-testid="button-view-all-companies">
                                    View All {allCompanies.length} Companies
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Super Admin: Recent Payments */}
            {isSuperAdmin && allPayments && (
                <Card data-testid="card-recent-payments">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Recent Payments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {allPayments.slice(0, 5).map((payment) => {
                                const company = allCompanies?.find(
                                    (c) => c.id === payment.companyId
                                );
                                return (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                        data-testid={`payment-${payment.id}`}>
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {company?.name ||
                                                    `Company #${payment.companyId}`}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(
                                                    payment.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                            {payment.slotType &&
                                                payment.slotQuantity && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {payment.slotQuantity}{" "}
                                                        {payment.slotType} slot
                                                        {payment.slotQuantity >
                                                        1
                                                            ? "s"
                                                            : ""}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                ${payment.amount}{" "}
                                                {payment.currency}
                                            </p>
                                            <p
                                                className={`text-xs capitalize ${
                                                    payment.paymentStatus ===
                                                    "paid"
                                                        ? "text-green-600"
                                                        : payment.paymentStatus ===
                                                          "pending"
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}>
                                                {payment.paymentStatus}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {allPayments.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    No payments yet
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Metrics - Company Admin Only */}
            {!isSuperAdmin && (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Users"
                        value={stats?.totalUsers || 0}
                        icon={Users}
                        trend="+12%"
                        data-testid="metric-total-users"
                    />
                    <MetricCard
                        title="Today's Reports"
                        value={stats?.todayReports || 0}
                        icon={FileText}
                        trend="+8%"
                        data-testid="metric-today-reports"
                    />
                    <MetricCard
                        title="Pending Tasks"
                        value={stats?.pendingTasks || 0}
                        icon={FolderOpen}
                        trend="-3%"
                        data-testid="metric-pending-tasks"
                    />
                    <MetricCard
                        title="Completed Tasks"
                        value={stats?.completedTasks || 0}
                        icon={CheckCircle}
                        trend="+15%"
                        data-testid="metric-completed-tasks"
                    />
                </div>
            )}

            {/* Quick Actions - Company Admin Only */}
            {!isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                            {quickActions.map((action, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="justify-start gap-3 h-auto py-3 sm:py-4"
                                    onClick={action.onClick}>
                                    <action.icon className="h-5 w-5" />
                                    <span className="text-sm sm:text-base">
                                        {action.label}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Company Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent data-testid="dialog-delete-company">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Company</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <span className="font-semibold">
                                {companyToDelete?.name}
                            </span>
                            ? This will deactivate the company and all
                            associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteCompany}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteCompanyMutation.isPending}
                            data-testid="button-confirm-delete">
                            {deleteCompanyMutation.isPending
                                ? "Removing..."
                                : "Remove Company"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
