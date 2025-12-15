import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone, MapPin, Users, TrendingUp, Calendar, DollarSign, Ban, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
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
import { useState } from "react";

interface CompanyDetailsModalProps {
  company: {
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
    maxAdmins: number;
    maxMembers: number;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
    currentAdmins?: number;
    currentMembers?: number;
  } | null;
  open: boolean;
  onClose: () => void;
  onSuspend?: (companyId: number) => void;
  onReactivate?: (companyId: number) => void;
  onDelete?: (companyId: number) => void;
}

export default function CompanyDetailsModal({
  company,
  open,
  onClose,
  onSuspend,
  onReactivate,
  onDelete,
}: CompanyDetailsModalProps) {
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!company) return null;

  const handleSuspend = () => {
    if (onSuspend) {
      onSuspend(company.id);
      setSuspendDialogOpen(false);
      onClose();
    }
  };

  const handleReactivate = () => {
    if (onReactivate) {
      onReactivate(company.id);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(company.id);
      setDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-company-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {company.logo ? (
                <img 
                  src={company.logo} 
                  alt="Company Logo" 
                  className="h-12 w-12 rounded-lg object-cover border"
                  data-testid="img-company-logo"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-company-name">{company.name}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-server-id">{company.serverId}</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Complete company information and management actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge 
                variant={company.isActive ? "default" : "destructive"} 
                className="text-sm"
                data-testid="badge-company-status"
              >
                {company.isActive ? "🟢 Active" : "🔴 Suspended"}
              </Badge>
              <div className="flex gap-2">
                {company.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuspendDialogOpen(true)}
                    className="text-destructive"
                    data-testid="button-suspend"
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Suspend Company
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivate}
                    className="text-green-600"
                    data-testid="button-reactivate"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Reactivate Company
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="button-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <Card data-testid="card-basic-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Company Type</p>
                    <p className="font-medium" data-testid="text-company-type">{company.companyType || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Description</p>
                    <p className="text-sm" data-testid="text-description">{company.description || "No description provided"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium" data-testid="text-location">{company.location || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card data-testid="card-contact-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact Person</p>
                    <p className="font-medium" data-testid="text-contact-person">{company.contactPerson || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Designation</p>
                    <p className="font-medium" data-testid="text-designation">{company.designation || "Not specified"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium" data-testid="text-email">{company.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobile</p>
                    <p className="font-medium" data-testid="text-mobile">{company.mobile || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium" data-testid="text-phone">{company.phone || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <p className="font-medium text-xs break-all" data-testid="text-website">{company.website || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card data-testid="card-address-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="text-sm" data-testid="text-address">{company.address || "Not specified"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">City</p>
                      <p className="font-medium" data-testid="text-city">{company.city || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pincode</p>
                      <p className="font-medium" data-testid="text-pincode">{company.pincode || "N/A"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">State</p>
                      <p className="font-medium" data-testid="text-state">{company.state || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Country</p>
                      <p className="font-medium" data-testid="text-country">{company.country || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card data-testid="card-business-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Number of Employees</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-employees">
                      <Users className="h-4 w-4" />
                      {company.employees || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Annual Turnover</p>
                    <p className="font-medium" data-testid="text-turnover">{company.annualTurnover || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year Established</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-year-established">
                      <Calendar className="h-4 w-4" />
                      {company.yearEstablished || "Not specified"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Slot Information */}
              <Card data-testid="card-slot-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    Slot Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Admin Slots</p>
                    <p className="font-medium" data-testid="text-admin-slots">
                      {company.currentAdmins !== undefined ? `${company.currentAdmins} / ${company.maxAdmins}` : company.maxAdmins}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Member Slots</p>
                    <p className="font-medium" data-testid="text-member-slots">
                      {company.currentMembers !== undefined ? `${company.currentMembers} / ${company.maxMembers}` : company.maxMembers}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Information */}
              <Card data-testid="card-audit-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Audit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created By</p>
                    <p className="font-medium" data-testid="text-created-by">{company.createdBy || "System"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created Date</p>
                    <p className="font-medium" data-testid="text-created-date">
                      {format(new Date(company.createdAt), 'PPP p')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated By</p>
                    <p className="font-medium" data-testid="text-updated-by">{company.updatedBy || "Not updated"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated Date</p>
                    <p className="font-medium" data-testid="text-updated-date">
                      {format(new Date(company.updatedAt), 'PPP p')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent data-testid="dialog-suspend-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Company?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{company.name}</strong>? 
              This will prevent all users from this company from accessing the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSuspend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-suspend"
            >
              Suspend Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{company.name}</strong>? 
              This action cannot be undone and will remove all associated data including users, tasks, and reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
