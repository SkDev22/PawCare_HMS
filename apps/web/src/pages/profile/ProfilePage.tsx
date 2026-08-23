import { UserRound, KeyRound, Laptop2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChangePasswordForm } from './components/ChangePasswordForm';
import { ProfileInfoForm } from './components/ProfileInfoForm';
import { ProfileSummaryCard } from './components/ProfileSummaryCard';
import { SessionsCard } from './components/SessionsCard';

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account details and security
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProfileSummaryCard />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-1.5">
                <UserRound className="size-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5">
                <KeyRound className="size-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserRound className="size-4 text-brand-600" />
                    Personal information
                  </CardTitle>
                  <CardDescription>Update your name and contact details</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileInfoForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound className="size-4 text-brand-600" />
                    Change password
                  </CardTitle>
                  <CardDescription>Choose a strong password you don't reuse elsewhere</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Laptop2 className="size-4 text-brand-600" />
                    Active sessions
                  </CardTitle>
                  <CardDescription>Manage where you're signed in</CardDescription>
                </CardHeader>
                <CardContent>
                  <SessionsCard />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
