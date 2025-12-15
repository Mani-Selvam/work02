import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, User, Phone, Mail } from "lucide-react";
import type { Followup, Enquiry } from "@shared/schema";

interface FollowupCalendarProps {
  followups: Followup[];
  enquiries: Enquiry[];
}

interface FollowupWithEnquiry extends Followup {
  enquiryDetails?: Enquiry;
}

export default function FollowupCalendar({ followups, enquiries }: FollowupCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = startOfDay(new Date());

  // Get followups for a specific date
  const getFollowupsForDate = (date: Date): FollowupWithEnquiry[] => {
    return followups
      .filter(f => {
        if (!f.nextFollowupDate) return false;
        const followupDate = parseISO(f.nextFollowupDate);
        return isSameDay(followupDate, date);
      })
      .map(f => ({
        ...f,
        enquiryDetails: enquiries.find(e => e.id === f.enquiryId),
      }))
      .filter(f => f.enquiryDetails?.status !== 'dropped'); // Hide dropped enquiries
  };

  // Check if date has followups
  const hasFollowups = (date: Date): { count: number; type: 'today' | 'overdue' | 'upcoming' } | null => {
    const followupsOnDate = getFollowupsForDate(date);
    if (followupsOnDate.length === 0) return null;

    const dateStart = startOfDay(date);
    
    if (isSameDay(dateStart, today)) {
      return { count: followupsOnDate.length, type: 'today' };
    } else if (isBefore(dateStart, today)) {
      return { count: followupsOnDate.length, type: 'overdue' };
    } else {
      return { count: followupsOnDate.length, type: 'upcoming' };
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    const followupsOnDate = getFollowupsForDate(date);
    if (followupsOnDate.length > 0) {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  const getBadgeVariant = (type: 'today' | 'overdue' | 'upcoming') => {
    switch (type) {
      case 'today':
        return 'destructive';
      case 'overdue':
        return 'secondary';
      case 'upcoming':
        return 'default';
    }
  };

  const getBadgeLabel = (type: 'today' | 'overdue' | 'upcoming') => {
    switch (type) {
      case 'today':
        return 'Today';
      case 'overdue':
        return 'Overdue';
      case 'upcoming':
        return 'Upcoming';
    }
  };

  return (
    <>
      <Card data-testid="card-followup-calendar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Follow-up Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateClick}
            className="rounded-md border"
            modifiers={{
              hasFollowups: (date) => hasFollowups(date) !== null,
            }}
            modifiersStyles={{
              hasFollowups: {
                fontWeight: 'bold',
                position: 'relative',
              },
            }}
            components={{
              Day: ({ date, displayMonth }) => {
                const followupInfo = hasFollowups(date);
                const isToday = isSameDay(date, today);
                
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDateClick(date)}
                      className={`
                        h-9 w-9 p-0 font-normal aria-selected:opacity-100
                        ${isToday ? 'bg-accent text-accent-foreground rounded-md' : ''}
                        ${followupInfo ? 'font-bold' : ''}
                        hover:bg-accent hover:text-accent-foreground rounded-md
                      `}
                      data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                    >
                      {format(date, 'd')}
                      {followupInfo && (
                        <span
                          className={`
                            absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] flex items-center justify-center
                            ${followupInfo.type === 'today' ? 'bg-destructive text-destructive-foreground' : ''}
                            ${followupInfo.type === 'overdue' ? 'bg-orange-500 text-white dark:bg-orange-600' : ''}
                            ${followupInfo.type === 'upcoming' ? 'bg-primary text-primary-foreground' : ''}
                          `}
                          data-testid={`calendar-badge-${format(date, 'yyyy-MM-dd')}`}
                        >
                          {followupInfo.count}
                        </span>
                      )}
                    </button>
                  </div>
                );
              },
            }}
          />
          
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium">Legend:</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" data-testid="badge-legend-today">
                Today
              </Badge>
              <Badge variant="secondary" className="bg-orange-500 text-white dark:bg-orange-600" data-testid="badge-legend-overdue">
                Overdue
              </Badge>
              <Badge variant="default" data-testid="badge-legend-upcoming">
                Upcoming
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-followup-details">
          <DialogHeader>
            <DialogTitle>
              Follow-ups for {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && getFollowupsForDate(selectedDate).map((followup) => (
              <Card key={followup.id} data-testid={`followup-card-${followup.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {followup.enquiryDetails?.customerName || 'Unknown Customer'}
                      </CardTitle>
                      <Badge 
                        variant={getBadgeVariant(hasFollowups(selectedDate)?.type || 'upcoming')}
                        className="mt-2"
                        data-testid={`followup-badge-${followup.id}`}
                      >
                        {getBadgeLabel(hasFollowups(selectedDate)?.type || 'upcoming')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {followup.enquiryDetails?.mobileNo && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`followup-phone-${followup.id}`}>
                          {followup.enquiryDetails.mobileNo}
                        </span>
                      </div>
                    )}
                    {followup.enquiryDetails?.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate" data-testid={`followup-address-${followup.id}`}>
                          {followup.enquiryDetails.address}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {followup.enquiryDetails?.productName && (
                    <div className="text-sm">
                      <span className="font-medium">Product: </span>
                      <span className="text-muted-foreground" data-testid={`followup-product-${followup.id}`}>
                        {followup.enquiryDetails.productName}
                        {followup.enquiryDetails.productVariant && ` - ${followup.enquiryDetails.productVariant}`}
                      </span>
                    </div>
                  )}
                  
                  {followup.remark && (
                    <div className="text-sm">
                      <span className="font-medium">Follow-up Notes: </span>
                      <p className="text-muted-foreground mt-1" data-testid={`followup-notes-${followup.id}`}>
                        {followup.remark}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Status: </span>
                    <Badge variant="outline" data-testid={`followup-status-${followup.id}`}>
                      {followup.enquiryStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
