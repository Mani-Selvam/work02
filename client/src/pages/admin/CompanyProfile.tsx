import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    Users,
    TrendingUp,
    Calendar,
    Edit,
    Loader2,
    CheckCircle2,
    Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { format } from "date-fns";

interface CompanyProfile {
    id: number;
    serverId: string;
    name: string;
    email: string;
    phone: string | null;
    website: string | null;
    location: string | null;
    description: string | null;
    companyType: string | null;
    contactPerson: string | null;
    designation: string | null;
    mobile: string | null;
    address: string | null;
    pincode: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    employees: number | null;
    annualTurnover: string | null;
    yearEstablished: number | null;
    logo: string | null;
    isActive: boolean;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

const companyProfileSchema = z.object({
    companyType: z.string().min(1, "Company type is required"),
    contactPerson: z.string().min(1, "Contact person is required"),
    designation: z.string().min(1, "Designation is required"),
    mobile: z.string().min(10, "Valid mobile number is required"),
    phone: z.string().optional(),
    website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    address: z.string().min(5, "Address is required"),
    pincode: z.string().min(4, "Valid pincode is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    country: z.string().min(2, "Country is required"),
    employees: z.string().min(1, "Number of employees is required"),
    annualTurnover: z.string().min(1, "Annual turnover is required"),
    yearEstablished: z.string().min(4, "Year established is required"),
    description: z.string().optional(),
    logo: z.string().optional(),
});

type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

const companyTypes = [
    "Contractor",
    "Builder",
    "Developer",
    "Supplier",
    "Architect",
    "Consultant",
    "Other",
];

const designations = [
    "Owner",
    "Director",
    "Manager",
    "Engineer",
    "Supervisor",
    "Administrator",
    "Other",
];

const turnoverRanges = [
    "₹1–10 Cr",
    "₹10–50 Cr",
    "₹50–100 Cr",
    "₹100–500 Cr",
    "₹500+ Cr",
];

export default function CompanyProfile() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const { data: company, isLoading } = useQuery<CompanyProfile>({
        queryKey: ["/api/my-company/profile"],
        enabled: !!dbUserId,
    });

    const form = useForm<CompanyProfileFormData>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: {
            companyType: "",
            contactPerson: "",
            designation: "",
            mobile: "",
            phone: "",
            website: "",
            address: "",
            pincode: "",
            city: "",
            state: "",
            country: "India",
            employees: "",
            annualTurnover: "",
            yearEstablished: "",
            description: "",
            logo: "",
        },
    });

    // Reset form when company data loads
    useEffect(() => {
        if (company) {
            form.reset({
                companyType: company.companyType || "",
                contactPerson: company.contactPerson || "",
                designation: company.designation || "",
                mobile: company.mobile || "",
                phone: company.phone || "",
                website: company.website || "",
                address: company.address || "",
                pincode: company.pincode || "",
                city: company.city || "",
                state: company.state || "",
                country: company.country || "India",
                employees: company.employees?.toString() || "",
                annualTurnover: company.annualTurnover || "",
                yearEstablished: company.yearEstablished?.toString() || "",
                description: company.description || "",
                logo: company.logo || "",
            });
        }
    }, [company, form]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: CompanyProfileFormData) => {
            const payload = {
                ...data,
                employees: parseInt(data.employees),
                yearEstablished: parseInt(data.yearEstablished),
            };
            return await apiRequest(
                `${API_BASE_URL}/api/my-company/profile`,
                "PATCH",
                payload
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/my-company/profile"],
            });
            toast({
                title: "Success",
                description: "✅ Company details updated successfully!",
            });
            setEditDialogOpen(false);
            setLogoFile(null);
            setLogoPreview(null);
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.message || "Failed to update company details",
            });
        },
    });

    const handleEditClick = () => {
        if (company) {
            form.reset({
                companyType: company.companyType || "",
                contactPerson: company.contactPerson || "",
                designation: company.designation || "",
                mobile: company.mobile || "",
                phone: company.phone || "",
                website: company.website || "",
                address: company.address || "",
                pincode: company.pincode || "",
                city: company.city || "",
                state: company.state || "",
                country: company.country || "India",
                employees: company.employees?.toString() || "",
                annualTurnover: company.annualTurnover || "",
                yearEstablished: company.yearEstablished?.toString() || "",
                description: company.description || "",
                logo: company.logo || "",
            });
        }
        setEditDialogOpen(true);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    variant: "destructive",
                    title: "File too large",
                    description: "Logo must be smaller than 5MB",
                });
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
                form.setValue("logo", reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = (data: CompanyProfileFormData) => {
        updateProfileMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-10">
                        <p className="text-center text-muted-foreground">
                            Company profile not found
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="space-y-6 p-6 bg-background"
            data-testid="page-company-profile">
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold"
                        data-testid="text-page-title">
                        Company Profile
                    </h1>
                    <p className="text-muted-foreground">
                        View and manage your company information
                    </p>
                </div>
                <Button
                    onClick={handleEditClick}
                    data-testid="button-edit-profile">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card data-testid="card-basic-info">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            {company.logo ? (
                                <img
                                    src={company.logo}
                                    alt="Company Logo"
                                    className="h-16 w-16 rounded-lg object-cover border"
                                    data-testid="img-company-logo"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <h3
                                    className="font-semibold text-lg"
                                    data-testid="text-company-name">
                                    {company.name}
                                </h3>
                                <Badge
                                    variant={
                                        company.isActive
                                            ? "default"
                                            : "destructive"
                                    }
                                    data-testid="badge-company-status">
                                    {company.isActive
                                        ? "🟢 Active"
                                        : "🔴 Inactive"}
                                </Badge>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid gap-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Company ID
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-server-id">
                                    {company.serverId}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Company Type
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-company-type">
                                    {company.companyType || "Not specified"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Description
                                </p>
                                <p
                                    className="text-sm"
                                    data-testid="text-description">
                                    {company.description ||
                                        "No description provided"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card data-testid="card-contact-info">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Contact Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Contact Person
                            </p>
                            <p
                                className="font-medium"
                                data-testid="text-contact-person">
                                {company.contactPerson || "Not specified"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Designation
                            </p>
                            <p
                                className="font-medium"
                                data-testid="text-designation">
                                {company.designation || "Not specified"}
                            </p>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Email
                            </p>
                            <p className="font-medium" data-testid="text-email">
                                {company.email}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Mobile
                            </p>
                            <p
                                className="font-medium"
                                data-testid="text-mobile">
                                {company.mobile || "Not specified"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Phone
                            </p>
                            <p className="font-medium" data-testid="text-phone">
                                {company.phone || "Not specified"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Website
                            </p>
                            <p
                                className="font-medium"
                                data-testid="text-website">
                                {company.website || "Not specified"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card data-testid="card-address-info">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Address Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Address
                            </p>
                            <p className="text-sm" data-testid="text-address">
                                {company.address || "Not specified"}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    City
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-city">
                                    {company.city || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Pincode
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-pincode">
                                    {company.pincode || "N/A"}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    State
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-state">
                                    {company.state || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Country
                                </p>
                                <p
                                    className="font-medium"
                                    data-testid="text-country">
                                    {company.country || "N/A"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card data-testid="card-business-info">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Business Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Number of Employees
                            </p>
                            <p
                                className="font-medium flex items-center gap-2"
                                data-testid="text-employees">
                                <Users className="h-4 w-4" />
                                {company.employees || "Not specified"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Average Annual Turnover
                            </p>
                            <p
                                className="font-medium"
                                data-testid="text-turnover">
                                {company.annualTurnover || "Not specified"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Year Established
                            </p>
                            <p
                                className="font-medium flex items-center gap-2"
                                data-testid="text-year-established">
                                <Calendar className="h-4 w-4" />
                                {company.yearEstablished || "Not specified"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card data-testid="card-audit-info">
                <CardHeader>
                    <CardTitle>Audit Information</CardTitle>
                    <CardDescription>
                        Track changes to your company profile
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Created By
                        </p>
                        <p
                            className="font-medium"
                            data-testid="text-created-by">
                            {company.createdBy || "System"}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Created Date
                        </p>
                        <p
                            className="font-medium"
                            data-testid="text-created-date">
                            {format(new Date(company.createdAt), "PPP p")}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Updated By
                        </p>
                        <p
                            className="font-medium"
                            data-testid="text-updated-by">
                            {company.updatedBy || "Not updated"}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Updated Date
                        </p>
                        <p
                            className="font-medium"
                            data-testid="text-updated-date">
                            {format(new Date(company.updatedAt), "PPP p")}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent
                    className="max-w-2xl max-h-[90vh] overflow-y-auto"
                    data-testid="dialog-edit-profile">
                    <DialogHeader>
                        <DialogTitle>Edit Company Profile</DialogTitle>
                        <DialogDescription>
                            Update your company information. All changes will be
                            tracked with your username and timestamp.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <FormLabel>Company Logo</FormLabel>
                                    <div className="flex items-center gap-4 mt-2">
                                        {(logoPreview || company.logo) && (
                                            <img
                                                src={
                                                    logoPreview ||
                                                    company.logo ||
                                                    ""
                                                }
                                                alt="Logo Preview"
                                                className="h-20 w-20 rounded-lg object-cover border"
                                                data-testid="img-logo-preview"
                                            />
                                        )}
                                        <div>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="cursor-pointer"
                                                data-testid="input-logo-upload"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Max size: 5MB. Recommended:
                                                500x500px
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="companyType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Company Type *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="select-company-type">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {companyTypes.map(
                                                            (type) => (
                                                                <SelectItem
                                                                    key={type}
                                                                    value={type}
                                                                    data-testid={`option-type-${type}`}>
                                                                    {type}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="contactPerson"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Contact Person *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="John Doe"
                                                        data-testid="input-contact-person"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="designation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Designation *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="select-designation">
                                                            <SelectValue placeholder="Select designation" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {designations.map(
                                                            (des) => (
                                                                <SelectItem
                                                                    key={des}
                                                                    value={des}
                                                                    data-testid={`option-designation-${des}`}>
                                                                    {des}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="mobile"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Mobile Number *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="9876543210"
                                                        data-testid="input-mobile"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Phone Number
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Optional"
                                                        data-testid="input-phone"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="https://example.com"
                                                        data-testid="input-website"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address *</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="23, Main Street, Perundurai"
                                                    rows={2}
                                                    data-testid="input-address"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Erode"
                                                        data-testid="input-city"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="pincode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pincode *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="638001"
                                                        data-testid="input-pincode"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>State *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Tamil Nadu"
                                                        data-testid="input-state"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="India"
                                                        data-testid="input-country"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="employees"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Number of Employees *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        placeholder="25"
                                                        data-testid="input-employees"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="annualTurnover"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Average Annual Turnover *
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="select-turnover">
                                                            <SelectValue placeholder="Select range" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {turnoverRanges.map(
                                                            (range) => (
                                                                <SelectItem
                                                                    key={range}
                                                                    value={
                                                                        range
                                                                    }
                                                                    data-testid={`option-turnover-${range}`}>
                                                                    {range}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="yearEstablished"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Year Established *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        placeholder="2005"
                                                        data-testid="input-year-established"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Brief description about your company"
                                                    rows={3}
                                                    data-testid="input-description"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditDialogOpen(false)}
                                    disabled={updateProfileMutation.isPending}
                                    data-testid="button-cancel">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateProfileMutation.isPending}
                                    data-testid="button-save-changes">
                                    {updateProfileMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
