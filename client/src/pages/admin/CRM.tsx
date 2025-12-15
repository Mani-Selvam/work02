import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Edit,
    Trash2,
    TrendingUp,
    TrendingDown,
    Calendar,
    UserPlus,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Enquiry, Followup } from "@shared/schema";
import FollowupCalendar from "@/components/FollowupCalendar";

const STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "followup", label: "Followup" },
    { value: "negotiation", label: "Negotiation" },
    { value: "sales_closed", label: "Sales Closed" },
    { value: "dropped", label: "Dropped" },
];

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "upi", label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
];

const LEAD_SOURCES = [
    { value: "website", label: "Website" },
    { value: "social_media", label: "Social Media" },
    { value: "referral", label: "Referral" },
    { value: "walk_in", label: "Walk-in" },
    { value: "phone", label: "Phone" },
    { value: "email", label: "Email" },
    { value: "other", label: "Other" },
];

interface CRMStats {
    totalEnquiries: number;
    monthEnquiries: number;
    totalSales: number;
    monthSales: number;
    todayFollowups: number;
    totalDrops: number;
    monthDrops: number;
}

export default function CRM() {
    const [currentSection, setCurrentSection] = useState(0);
    const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(
        null
    );
    const [selectedEnquiryForFollowup, setSelectedEnquiryForFollowup] =
        useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [enquiryFormKey, setEnquiryFormKey] = useState(0);
    const [followupFormKey, setFollowupFormKey] = useState(0);
    const { toast } = useToast();

    const { data: stats } = useQuery<CRMStats>({
        queryKey: ["/api/crm/stats"],
    });

    const { data: enquiries = [] } = useQuery<Enquiry[]>({
        queryKey: ["/api/crm/enquiries"],
    });

    const { data: followups = [] } = useQuery<Followup[]>({
        queryKey: ["/api/crm/followups"],
    });

    const createEnquiryMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/enquiries`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({ title: "Enquiry created successfully" });
            setSelectedEnquiry(null);
            setEnquiryFormKey((prev) => prev + 1);
            setCurrentSection(1);
        },
    });

    const updateEnquiryMutation = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/enquiries/${id}`,
                "PATCH",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({ title: "Enquiry updated successfully" });
            setSelectedEnquiry(null);
            setCurrentSection(1);
        },
    });

    const deleteEnquiryMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/enquiries/${id}`,
                "DELETE"
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({ title: "Enquiry deleted successfully" });
        },
    });

    const markAsWonMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/enquiries/${id}`,
                "PATCH",
                { status: "sales_closed" }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({
                title: "Enquiry marked as Won!",
                description: "Sales closed successfully",
            });
        },
    });

    const markAsLostMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/enquiries/${id}`,
                "PATCH",
                { status: "dropped" }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({
                title: "Enquiry marked as Lost",
                description: "Moved to dropped status",
            });
        },
    });

    const createFollowupMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest(
                `${API_BASE_URL}/api/crm/followups`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/followups"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/enquiries"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/crm/stats"],
            });
            toast({ title: "Followup created successfully" });
            setSelectedEnquiryForFollowup(null);
            setFollowupFormKey((prev) => prev + 1);
            setCurrentSection(3);
        },
    });

    const handleEnquirySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        if (selectedEnquiry) {
            updateEnquiryMutation.mutate({ id: selectedEnquiry.id, ...data });
        } else {
            createEnquiryMutation.mutate(data);
        }
    };

    const handleFollowupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        createFollowupMutation.mutate(data);
        e.currentTarget.reset();
    };

    const filteredEnquiries = enquiries.filter(
        (enq) =>
            enq.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enq.mobileNo.includes(searchTerm) ||
            (enq.productName?.toLowerCase() || "").includes(
                searchTerm.toLowerCase()
            )
    );

    const sections = [
        // Section 0: Dashboard Overview
        <div key="dashboard" className="min-w-full flex-shrink-0 p-6 space-y-6">
            <h2
                className="text-2xl font-bold"
                data-testid="text-crm-dashboard-title">
                CRM Dashboard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="card-total-enquiries">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Enquiries
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.totalEnquiries || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.monthEnquiries || 0} this month
                        </p>
                    </CardContent>
                </Card>

                <Card
                    data-testid="card-won-enquiries"
                    className="border-green-200 dark:border-green-900">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Won Enquiries
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                            {stats?.totalSales || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.monthSales || 0} this month
                        </p>
                    </CardContent>
                </Card>

                <Card
                    data-testid="card-lost-enquiries"
                    className="border-red-200 dark:border-red-900">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Lost Enquiries
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-500">
                            {stats?.totalDrops || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.monthDrops || 0} this month
                        </p>
                    </CardContent>
                </Card>

                <Card data-testid="card-today-followups">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Today's Follow-ups
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.todayFollowups || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Scheduled for today
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <FollowupCalendar followups={followups} enquiries={enquiries} />
            </div>
        </div>,

        // Section 1: Enquiry List
        <div
            key="enquiry-list"
            className="min-w-full flex-shrink-0 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                    className="text-2xl font-bold"
                    data-testid="text-enquiry-list-title">
                    Enquiry List
                </h2>
                <Button
                    onClick={() => {
                        setSelectedEnquiry(null);
                        setEnquiryFormKey((prev) => prev + 1);
                        setCurrentSection(2);
                    }}
                    data-testid="button-add-enquiry">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Enquiry
                </Button>
            </div>

            <Input
                placeholder="Search by customer name, mobile, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-enquiries"
            />

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Mobile No</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Enquiry Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEnquiries.map((enq) => (
                                    <TableRow
                                        key={enq.id}
                                        data-testid={`row-enquiry-${enq.id}`}>
                                        <TableCell>
                                            {enq.customerName}
                                        </TableCell>
                                        <TableCell>{enq.mobileNo}</TableCell>
                                        <TableCell>{enq.productName}</TableCell>
                                        <TableCell>
                                            <span className="capitalize">
                                                {enq.status.replace("_", " ")}
                                            </span>
                                        </TableCell>
                                        <TableCell>{enq.enquiryDate}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {enq.status !==
                                                    "sales_closed" &&
                                                    enq.status !==
                                                        "dropped" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                                                                onClick={() =>
                                                                    markAsWonMutation.mutate(
                                                                        enq.id
                                                                    )
                                                                }
                                                                data-testid={`button-mark-won-${enq.id}`}
                                                                title="Mark as Won">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    markAsLostMutation.mutate(
                                                                        enq.id
                                                                    )
                                                                }
                                                                data-testid={`button-mark-lost-${enq.id}`}
                                                                title="Mark as Lost">
                                                                <XCircle className="h-3 w-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedEnquiry(enq);
                                                        setCurrentSection(2);
                                                    }}
                                                    data-testid={`button-edit-enquiry-${enq.id}`}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedEnquiryForFollowup(
                                                            enq.id
                                                        );
                                                        setFollowupFormKey(
                                                            (prev) => prev + 1
                                                        );
                                                        setCurrentSection(4);
                                                    }}
                                                    data-testid={`button-add-followup-${enq.id}`}>
                                                    <UserPlus className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        deleteEnquiryMutation.mutate(
                                                            enq.id
                                                        )
                                                    }
                                                    data-testid={`button-delete-enquiry-${enq.id}`}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>,

        // Section 2: Add/Edit Enquiry Form
        <div
            key="enquiry-form"
            className="min-w-full flex-shrink-0 p-6 space-y-6">
            <h2
                className="text-2xl font-bold"
                data-testid="text-enquiry-form-title">
                {selectedEnquiry ? "Edit Enquiry" : "Add New Enquiry"}
            </h2>

            <Card>
                <CardContent className="p-6">
                    <form
                        key={selectedEnquiry?.id || `new-${enquiryFormKey}`}
                        onSubmit={handleEnquirySubmit}
                        className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerName">
                                    Customer Name *
                                </Label>
                                <Input
                                    id="customerName"
                                    name="customerName"
                                    required
                                    defaultValue={selectedEnquiry?.customerName}
                                    data-testid="input-customer-name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="mobileNo">Mobile No *</Label>
                                <Input
                                    id="mobileNo"
                                    name="mobileNo"
                                    required
                                    defaultValue={selectedEnquiry?.mobileNo}
                                    data-testid="input-mobile-no"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="productName">
                                    Product Name
                                </Label>
                                <Input
                                    id="productName"
                                    name="productName"
                                    defaultValue={
                                        selectedEnquiry?.productName || ""
                                    }
                                    data-testid="input-product-name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="productVariant">
                                    Product Variant
                                </Label>
                                <Input
                                    id="productVariant"
                                    name="productVariant"
                                    defaultValue={
                                        selectedEnquiry?.productVariant || ""
                                    }
                                    data-testid="input-product-variant"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <Input
                                    id="color"
                                    name="color"
                                    defaultValue={selectedEnquiry?.color || ""}
                                    data-testid="input-color"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod">
                                    Payment Method
                                </Label>
                                <Select
                                    key={`payment-${
                                        selectedEnquiry?.id || enquiryFormKey
                                    }`}
                                    name="paymentMethod"
                                    defaultValue={
                                        selectedEnquiry?.paymentMethod || ""
                                    }>
                                    <SelectTrigger data-testid="select-payment-method">
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((method) => (
                                            <SelectItem
                                                key={method.value}
                                                value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="enquiryDate">
                                    Enquiry Date *
                                </Label>
                                <Input
                                    id="enquiryDate"
                                    name="enquiryDate"
                                    type="date"
                                    required
                                    defaultValue={
                                        selectedEnquiry?.enquiryDate ||
                                        format(new Date(), "yyyy-MM-dd")
                                    }
                                    data-testid="input-enquiry-date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="leadSource">Lead Source</Label>
                                <Select
                                    key={`source-${
                                        selectedEnquiry?.id || enquiryFormKey
                                    }`}
                                    name="leadSource"
                                    defaultValue={
                                        selectedEnquiry?.leadSource || ""
                                    }>
                                    <SelectTrigger data-testid="select-lead-source">
                                        <SelectValue placeholder="Select lead source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LEAD_SOURCES.map((source) => (
                                            <SelectItem
                                                key={source.value}
                                                value={source.value}>
                                                {source.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    key={`status-${
                                        selectedEnquiry?.id || enquiryFormKey
                                    }`}
                                    name="status"
                                    defaultValue={
                                        selectedEnquiry?.status || "new"
                                    }>
                                    <SelectTrigger data-testid="select-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((status) => (
                                            <SelectItem
                                                key={status.value}
                                                value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-full space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    name="address"
                                    defaultValue={
                                        selectedEnquiry?.address || ""
                                    }
                                    data-testid="textarea-address"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                data-testid="button-submit-enquiry">
                                {selectedEnquiry
                                    ? "Update Enquiry"
                                    : "Create Enquiry"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setSelectedEnquiry(null);
                                    setCurrentSection(1);
                                }}
                                data-testid="button-cancel-enquiry">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>,

        // Section 3: Followup List
        <div
            key="followup-list"
            className="min-w-full flex-shrink-0 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                    className="text-2xl font-bold"
                    data-testid="text-followup-list-title">
                    Followup List
                </h2>
                <Button
                    onClick={() => {
                        setSelectedEnquiryForFollowup(null);
                        setFollowupFormKey((prev) => prev + 1);
                        setCurrentSection(4);
                    }}
                    data-testid="button-add-followup">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Followup
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Enquiry ID</TableHead>
                                    <TableHead>Followup Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Next Followup</TableHead>
                                    <TableHead>Remark</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {followups
                                    .filter((followup) => {
                                        const enquiry = enquiries.find(
                                            (e) => e.id === followup.enquiryId
                                        );
                                        return enquiry?.status !== "dropped";
                                    })
                                    .map((followup) => (
                                        <TableRow
                                            key={followup.id}
                                            data-testid={`row-followup-${followup.id}`}>
                                            <TableCell>
                                                {followup.enquiryId}
                                            </TableCell>
                                            <TableCell>
                                                {followup.followupDate}
                                            </TableCell>
                                            <TableCell>
                                                <span className="capitalize">
                                                    {followup.enquiryStatus.replace(
                                                        "_",
                                                        " "
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {followup.nextFollowupDate ||
                                                    "N/A"}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {followup.remark}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>,

        // Section 4: Add Followup Form
        <div
            key="followup-form"
            className="min-w-full flex-shrink-0 p-6 space-y-6">
            <h2
                className="text-2xl font-bold"
                data-testid="text-followup-form-title">
                Add New Followup
            </h2>

            <Card>
                <CardContent className="p-6">
                    <form
                        key={followupFormKey}
                        onSubmit={handleFollowupSubmit}
                        className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="enquiryId">
                                    Select Enquiry *
                                </Label>
                                <Select
                                    key={`enquiry-${followupFormKey}`}
                                    name="enquiryId"
                                    required
                                    defaultValue={
                                        selectedEnquiryForFollowup
                                            ? String(selectedEnquiryForFollowup)
                                            : undefined
                                    }>
                                    <SelectTrigger data-testid="select-enquiry-id">
                                        <SelectValue placeholder="Select an enquiry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {enquiries.map((enq) => (
                                            <SelectItem
                                                key={enq.id}
                                                value={String(enq.id)}>
                                                {enq.customerName} -{" "}
                                                {enq.mobileNo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="followupDate">
                                    Followup Date *
                                </Label>
                                <Input
                                    id="followupDate"
                                    name="followupDate"
                                    type="date"
                                    required
                                    defaultValue={format(
                                        new Date(),
                                        "yyyy-MM-dd"
                                    )}
                                    data-testid="input-followup-date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="enquiryStatus">
                                    Enquiry Status *
                                </Label>
                                <Select
                                    key={`enquiry-status-${followupFormKey}`}
                                    name="enquiryStatus"
                                    required>
                                    <SelectTrigger data-testid="select-enquiry-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((status) => (
                                            <SelectItem
                                                key={status.value}
                                                value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nextFollowupDate">
                                    Next Followup Date
                                </Label>
                                <Input
                                    id="nextFollowupDate"
                                    name="nextFollowupDate"
                                    type="date"
                                    data-testid="input-next-followup-date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment">Payment</Label>
                                <Input
                                    id="payment"
                                    name="payment"
                                    data-testid="input-payment"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expectedDeliveryDate">
                                    Expected Delivery Date
                                </Label>
                                <Input
                                    id="expectedDeliveryDate"
                                    name="expectedDeliveryDate"
                                    type="date"
                                    data-testid="input-expected-delivery-date"
                                />
                            </div>

                            <div className="col-span-full space-y-2">
                                <Label htmlFor="remark">Remark *</Label>
                                <Textarea
                                    id="remark"
                                    name="remark"
                                    required
                                    data-testid="textarea-remark"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                data-testid="button-submit-followup">
                                Create Followup
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCurrentSection(3)}
                                data-testid="button-cancel-followup">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>,

        // Section 5: Reports (placeholder)
        <div key="reports" className="min-w-full flex-shrink-0 p-6 space-y-6">
            <h2 className="text-2xl font-bold" data-testid="text-reports-title">
                CRM Reports
            </h2>
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                        <p>Reports section coming soon...</p>
                        <p className="text-sm mt-2">
                            Track sales performance, conversion rates, and lead
                            analysis.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>,
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-none flex flex-wrap items-center justify-between gap-2 p-4 border-b">
                <h1 className="text-3xl font-bold">CRM System</h1>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setCurrentSection(Math.max(0, currentSection - 1))
                        }
                        disabled={currentSection === 0}
                        data-testid="button-prev-section">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground flex items-center">
                        {currentSection + 1} / {sections.length}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setCurrentSection(
                                Math.min(
                                    sections.length - 1,
                                    currentSection + 1
                                )
                            )
                        }
                        disabled={currentSection === sections.length - 1}
                        data-testid="button-next-section">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div
                    className="h-full flex transition-transform duration-300 ease-in-out"
                    style={{
                        transform: `translateX(-${currentSection * 100}%)`,
                    }}>
                    {sections}
                </div>
            </div>
        </div>
    );
}
