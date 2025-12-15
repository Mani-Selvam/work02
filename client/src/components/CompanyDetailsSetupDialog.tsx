import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import {
    Building2,
    MapPin,
    Briefcase,
    CheckCircle2,
    Loader2,
} from "lucide-react";

const step1Schema = z.object({
    companyType: z.string().min(1, "Please select a company type"),
    designation: z.string().min(1, "Please select a designation"),
    logo: z.string().optional(),
});

const step2Schema = z.object({
    address: z.string().min(5, "Please enter a complete address"),
    pincode: z
        .string()
        .regex(/^\d{6}$/, "Please enter a valid 6-digit pincode"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    country: z.string().min(2, "Country is required").default("India"),
});

const step3Schema = z.object({
    employees: z.string().min(1, "Number of employees is required"),
    annualTurnover: z.string().min(1, "Please select annual turnover range"),
    yearEstablished: z.string().regex(/^\d{4}$/, "Please enter a valid year"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

interface CompanyDetailsSetupDialogProps {
    open: boolean;
    companyId: number;
    companyName: string;
    onComplete: () => void;
    onClose?: () => void;
}

export default function CompanyDetailsSetupDialog({
    open,
    companyId,
    companyName,
    onComplete,
    onClose,
}: CompanyDetailsSetupDialogProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form1 = useForm<Step1Data>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            companyType: "",
            designation: "",
            logo: "",
        },
    });

    const form2 = useForm<Step2Data>({
        resolver: zodResolver(step2Schema),
        defaultValues: {
            address: "",
            pincode: "",
            city: "",
            state: "",
            country: "India",
        },
    });

    const form3 = useForm<Step3Data>({
        resolver: zodResolver(step3Schema),
        defaultValues: {
            employees: "",
            annualTurnover: "",
            yearEstablished: "",
        },
    });

    const handleStep1Submit = async (data: Step1Data) => {
        try {
            setIsSubmitting(true);
            await apiRequest(`${API_BASE_URL}/api/companies/${companyId}`, "PATCH", data);
            setCurrentStep(2);
        } catch (error: any) {
            toast({
                title: "Error",
                description:
                    error.message || "Failed to save company information",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStep2Submit = async (data: Step2Data) => {
        try {
            setIsSubmitting(true);
            await apiRequest(`${API_BASE_URL}/api/companies/${companyId}`, "PATCH", data);
            setCurrentStep(3);
        } catch (error: any) {
            toast({
                title: "Error",
                description:
                    error.message || "Failed to save address information",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStep3Submit = async (data: Step3Data) => {
        try {
            setIsSubmitting(true);
            const payload = {
                ...data,
                employees: parseInt(data.employees),
                yearEstablished: parseInt(data.yearEstablished),
            };

            await apiRequest(`${API_BASE_URL}/api/companies/${companyId}`, "PATCH", payload);

            await queryClient.invalidateQueries({
                queryKey: [`${API_BASE_URL}/api/companies`, companyId],
            });

            toast({
                title: "Success!",
                description: "Company profile completed successfully",
            });

            onComplete();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save business details",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen && onClose) {
                    onClose();
                }
            }}>
            <DialogContent
                className="sm:max-w-[550px]"
                onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {currentStep === 1 && (
                            <>
                                <Building2 className="h-5 w-5 text-indigo-600" />{" "}
                                Basic Company Information
                            </>
                        )}
                        {currentStep === 2 && (
                            <>
                                <MapPin className="h-5 w-5 text-indigo-600" />{" "}
                                Address & Location
                            </>
                        )}
                        {currentStep === 3 && (
                            <>
                                <Briefcase className="h-5 w-5 text-indigo-600" />{" "}
                                Business Details
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {currentStep === 1 &&
                            "Step 1 of 3: Enter your company basic information"}
                        {currentStep === 2 &&
                            "Step 2 of 3: Provide your business address"}
                        {currentStep === 3 &&
                            "Step 3 of 3: Complete your business profile"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-center gap-2 py-4">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center">
                            <div
                                className={`h-2 w-2 rounded-full transition-colors ${
                                    step === currentStep
                                        ? "bg-indigo-600 h-3 w-3"
                                        : step < currentStep
                                        ? "bg-green-500"
                                        : "bg-gray-300"
                                }`}
                            />
                            {step < 3 && (
                                <div
                                    className={`h-0.5 w-12 ${
                                        step < currentStep
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {currentStep === 1 && (
                    <Form {...form1}>
                        <form
                            onSubmit={form1.handleSubmit(handleStep1Submit)}
                            className="space-y-4">
                            <FormField
                                control={form1.control}
                                name="companyType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-company-type">
                                                    <SelectValue placeholder="Select company type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Contractor">
                                                    Contractor
                                                </SelectItem>
                                                <SelectItem value="Builder">
                                                    Builder
                                                </SelectItem>
                                                <SelectItem value="Developer">
                                                    Developer
                                                </SelectItem>
                                                <SelectItem value="Supplier">
                                                    Supplier
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form1.control}
                                name="designation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Designation</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-designation">
                                                    <SelectValue placeholder="Select your designation" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Owner">
                                                    Owner
                                                </SelectItem>
                                                <SelectItem value="Manager">
                                                    Manager
                                                </SelectItem>
                                                <SelectItem value="Engineer">
                                                    Engineer
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form1.control}
                                name="logo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Company Logo (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="url"
                                                placeholder="https://example.com/logo.png"
                                                {...field}
                                                data-testid="input-logo"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    data-testid="button-next-step1">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                            Saving...
                                        </>
                                    ) : (
                                        "Next"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}

                {currentStep === 2 && (
                    <Form {...form2}>
                        <form
                            onSubmit={form2.handleSubmit(handleStep2Submit)}
                            className="space-y-4">
                            <FormField
                                control={form2.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter complete address"
                                                {...field}
                                                data-testid="input-address"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form2.control}
                                    name="pincode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pincode</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="123456"
                                                    {...field}
                                                    data-testid="input-pincode"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form2.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="City name"
                                                    {...field}
                                                    data-testid="input-city"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form2.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="State name"
                                                    {...field}
                                                    data-testid="input-state"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form2.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Country name"
                                                    {...field}
                                                    data-testid="input-country"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-between gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCurrentStep(1)}
                                    data-testid="button-back-step2">
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    data-testid="button-next-step2">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                            Saving...
                                        </>
                                    ) : (
                                        "Next"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}

                {currentStep === 3 && (
                    <Form {...form3}>
                        <form
                            onSubmit={form3.handleSubmit(handleStep3Submit)}
                            className="space-y-4">
                            <FormField
                                control={form3.control}
                                name="employees"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Number of Employees
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Enter number of employees"
                                                {...field}
                                                data-testid="input-employees"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form3.control}
                                name="annualTurnover"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Average Annual Turnover
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-turnover">
                                                    <SelectValue placeholder="Select turnover range" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Less than 1 Lakh">
                                                    Less than 1 Lakh
                                                </SelectItem>
                                                <SelectItem value="1-5 Lakhs">
                                                    1-5 Lakhs
                                                </SelectItem>
                                                <SelectItem value="5-10 Lakhs">
                                                    5-10 Lakhs
                                                </SelectItem>
                                                <SelectItem value="10-50 Lakhs">
                                                    10-50 Lakhs
                                                </SelectItem>
                                                <SelectItem value="50 Lakhs - 1 Crore">
                                                    50 Lakhs - 1 Crore
                                                </SelectItem>
                                                <SelectItem value="1-5 Crores">
                                                    1-5 Crores
                                                </SelectItem>
                                                <SelectItem value="More than 5 Crores">
                                                    More than 5 Crores
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form3.control}
                                name="yearEstablished"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Year Established</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="2020"
                                                {...field}
                                                data-testid="input-year-established"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-green-800 dark:text-green-500">
                                            Almost Done!
                                        </p>
                                        <p className="text-green-700 dark:text-green-400">
                                            After completing this step, you'll
                                            have full access to your dashboard.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCurrentStep(2)}
                                    data-testid="button-back-step3">
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    data-testid="button-complete">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                            Completing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                                            Complete Setup
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
