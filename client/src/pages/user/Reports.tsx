import { useAuth } from "@/contexts/AuthContext";
import TimeBasedForm from "@/components/TimeBasedForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sunrise, Moon, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const { user, dbUserId } = useAuth();
  const currentDate = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Reports</h2>
          <p className="text-muted-foreground mt-1">
            Submit your morning and evening work reports
          </p>
        </div>
        <Card className="sm:w-auto">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{format(currentDate, 'EEEE')}</p>
              <p className="text-xs text-muted-foreground">{format(currentDate, 'MMM dd, yyyy')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {user && dbUserId && (
        <Tabs defaultValue="morning" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted">
            <TabsTrigger 
              value="morning" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Sunrise className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Morning Report</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">9:30 - 11:30 AM</p>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="evening" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Moon className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Evening Report</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">6:30 - 11:30 PM</p>
                </div>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="morning" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Sunrise className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle>Morning Report</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Submit between 9:30 AM - 11:30 AM
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TimeBasedForm 
                  type="morning"
                  userName={user.displayName || ""}
                  userId={dbUserId}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="evening" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Moon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Evening Report</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Submit between 6:30 PM - 11:30 PM
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TimeBasedForm 
                  type="evening"
                  userName={user.displayName || ""}
                  userId={dbUserId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
