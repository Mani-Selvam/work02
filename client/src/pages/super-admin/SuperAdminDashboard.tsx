import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    Search,
    Ban,
    CheckCircle,
    MoreVertical,
    Eye,
    Trash2,
    Copy,
    Check,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";
import CompanyDetailsModal from "@/components/CompanyDetailsModal";

interface CompanyWithStats {
    company: Company;
    userCount: number;
    adminCount: number;
    memberCount: number;
}

interface AnalyticsData {
    totalCompanies: number;
    activeCompanies: number;
    suspendedCompanies: number;
    totalUsers: number;
    totalAdmins: number;
    totalMembers: number;
    totalTasks: number;
    totalPayments: number;
    totalRevenue: number;
}

export default function SuperAdminDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<
        "all" | "active" | "suspended"
    >("all");
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCompanyForDetails, setSelectedCompanyForDetails] =
        useState<any>(null);
    const [copiedServerId, setCopiedServerId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleCopyServerId = async (serverId: string) => {
        try {
            await navigator.clipboard.writeText(serverId);
            setCopiedServerId(serverId);
            toast({
                title: "Copied!",
                description: `Server ID ${serverId} copied to clipboard`,
            });
            setTimeout(() => setCopiedServerId(null), 2000);
        } catch (err) {
            toast({
                title: "Failed to copy",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleViewDetails = (companyData: CompanyWithStats) => {
        const fullCompanyData = {
            ...companyData.company,
            currentAdmins: companyData.adminCount,
            currentMembers: companyData.memberCount,
        };
        setSelectedCompanyForDetails(fullCompanyData);
        setShowDetailsModal(true);
    };

    const { data: companiesWithStats = [], isLoading: loadingCompanies } =
        useQuery<CompanyWithStats[]>({
            queryKey: ["/api/super-admin/companies-with-stats"],
        });

    const { data: analytics, isLoading: loadingAnalytics } =
        useQuery<AnalyticsData>({
            queryKey: ["/api/super-admin/analytics"],
        });

    const suspendMutation = useMutation({
        mutationFn: (companyId: number) =>
            apiRequest(
                `${API_BASE_URL}/api/super-admin/companies/${companyId}/suspend`,
                "POST"
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/companies-with-stats"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/analytics"],
            });
            toast({
                title: "Success",
                description: "Company suspended successfully",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to suspend company",
                variant: "destructive",
            });
        },
    });

    const reactivateMutation = useMutation({
        mutationFn: (companyId: number) =>
            apiRequest(
                `${API_BASE_URL}/api/super-admin/companies/${companyId}/reactivate`,
                "POST"
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/companies-with-stats"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/analytics"],
            });
            toast({
                title: "Success",
                description: "Company reactivated successfully",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to reactivate company",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (companyId: number) =>
            apiRequest(`${API_BASE_URL}/api/companies/${companyId}`, "DELETE"),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/companies-with-stats"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/super-admin/analytics"],
            });
            setShowDeleteDialog(false);
            setSelectedCompany(null);
            toast({
                title: "Success",
                description: "Company deleted successfully",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete company",
                variant: "destructive",
            });
        },
    });

    const filteredCompanies = companiesWithStats.filter((item) => {
        const matchesSearch =
            item.company.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            item.company.email
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            item.company.serverId
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "active" && item.company.isActive) ||
            (filterStatus === "suspended" && !item.company.isActive);

        return matchesSearch && matchesStatus;
    });

    if (loadingCompanies || loadingAnalytics) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div
            className="container mx-auto p-6 space-y-6"
            data-testid="super-admin-dashboard">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold" data-testid="page-title">
                        Super Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Manage companies, users, and view analytics
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total-companies">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Companies
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-companies">
                            {analytics?.totalCompanies || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.activeCompanies || 0} active,{" "}
                            {analytics?.suspendedCompanies || 0} suspended
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-total-users">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-users">
                            {analytics?.totalUsers || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analytics?.totalAdmins || 0} admins,{" "}
                            {analytics?.totalMembers || 0} members
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-total-payments">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Payments
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-payments">
                            {analytics?.totalPayments || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Payment transactions
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-total-revenue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold"
                            data-testid="text-total-revenue">
                            ₹{analytics?.totalRevenue || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From slot purchases
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Management</CardTitle>
                    <CardDescription>
                        View and manage all registered companies
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or server ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                                data-testid="input-search-companies"
                            />
                        </div>
                        <Tabs
                            value={filterStatus}
                            onValueChange={(v) =>
                                setFilterStatus(v as typeof filterStatus)
                            }
                            data-testid="tabs-company-filter">
                            <TabsList data-testid="tabs-list-company-status">
                                <TabsTrigger
                                    value="all"
                                    data-testid="filter-all">
                                    All
                                </TabsTrigger>
                                <TabsTrigger
                                    value="active"
                                    data-testid="filter-active">
                                    Active
                                </TabsTrigger>
                                <TabsTrigger
                                    value="suspended"
                                    data-testid="filter-suspended">
                                    Suspended
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCompanies.map(
                            ({
                                company,
                                userCount,
                                adminCount,
                                memberCount,
                            }) => (
                                <Card
                                    key={company.id}
                                    data-testid={`card-company-${company.id}`}
                                    className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1 flex-1">
                                                <CardTitle
                                                    className="text-lg"
                                                    data-testid={`text-company-name-${company.id}`}>
                                                    {company.name}
                                                </CardTitle>
                                                <CardDescription className="text-sm">
                                                    {company.email}
                                                </CardDescription>
                                                <div className="flex gap-2 mt-2 flex-wrap items-center">
                                                    <Badge
                                                        variant={
                                                            company.isActive
                                                                ? "default"
                                                                : "destructive"
                                                        }
                                                        data-testid={`badge-status-${company.id}`}>
                                                        {company.isActive
                                                            ? "Active"
                                                            : "Suspended"}
                                                    </Badge>
                                                    <div className="flex items-center gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            data-testid={`badge-server-id-${company.id}`}>
                                                            {company.serverId}
                                                        </Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() =>
                                                                handleCopyServerId(
                                                                    company.serverId
                                                                )
                                                            }
                                                            data-testid={`button-copy-server-id-${company.id}`}>
                                                            {copiedServerId ===
                                                            company.serverId ? (
                                                                <Check className="h-3 w-3 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        data-testid={`button-menu-${company.id}`}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleViewDetails({
                                                                company,
                                                                userCount,
                                                                adminCount,
                                                                memberCount,
                                                            })
                                                        }
                                                        data-testid={`menu-view-${company.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {company.isActive ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                suspendMutation.mutate(
                                                                    company.id
                                                                )
                                                            }
                                                            disabled={
                                                                suspendMutation.isPending
                                                            }
                                                            data-testid={`menu-suspend-${company.id}`}>
                                                            <Ban className="mr-2 h-4 w-4" />
                                                            Suspend
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                reactivateMutation.mutate(
                                                                    company.id
                                                                )
                                                            }
                                                            disabled={
                                                                reactivateMutation.isPending
                                                            }
                                                            data-testid={`menu-reactivate-${company.id}`}>
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Reactivate
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedCompany(
                                                                company.id
                                                            );
                                                            setShowDeleteDialog(
                                                                true
                                                            );
                                                        }}
                                                        className="text-destructive"
                                                        data-testid={`menu-delete-${company.id}`}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Company
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Total Users:
                                                </span>
                                                <span
                                                    className="font-medium"
                                                    data-testid={`text-user-count-${company.id}`}>
                                                    {userCount}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Admins:
                                                </span>
                                                <span
                                                    className="font-medium"
                                                    data-testid={`text-admin-count-${company.id}`}>
                                                    {adminCount} /{" "}
                                                    {company.maxAdmins}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Members:
                                                </span>
                                                <span
                                                    className="font-medium"
                                                    data-testid={`text-member-count-${company.id}`}>
                                                    {memberCount} /{" "}
                                                    {company.maxMembers}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </div>

                    {filteredCompanies.length === 0 && (
                        <div className="text-center py-12">
                            <p
                                className="text-muted-foreground"
                                data-testid="text-no-companies">
                                No companies found matching your search
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent data-testid="dialog-delete-company">
                    <DialogHeader>
                        <DialogTitle>Delete Company</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this company? This
                            action cannot be undone and will permanently delete
                            all company data, users, tasks, and reports.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            data-testid="button-cancel-delete">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                selectedCompany &&
                                deleteMutation.mutate(selectedCompany)
                            }
                            disabled={deleteMutation.isPending}
                            data-testid="button-confirm-delete">
                            {deleteMutation.isPending
                                ? "Deleting..."
                                : "Delete Company"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CompanyDetailsModal
                company={selectedCompanyForDetails}
                open={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                onSuspend={(companyId) => suspendMutation.mutate(companyId)}
                onReactivate={(companyId) =>
                    reactivateMutation.mutate(companyId)
                }
                onDelete={(companyId) => {
                    setSelectedCompany(companyId);
                    setShowDeleteDialog(true);
                }}
            />
        </div>
    );
}
