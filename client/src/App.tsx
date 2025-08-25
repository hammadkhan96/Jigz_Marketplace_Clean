import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/hooks/use-auth";
import { HelmetProvider } from "react-helmet-async";
import Home from "@/pages/home";
import Services from "@/pages/services";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import VerifyEmailPage from "@/pages/verify-email";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import MessagesPage from "@/pages/messages";
import NotificationsPage from "@/pages/notifications";
import JobDetailsPage from "@/pages/job-details";
import ServiceDetailsPage from "@/pages/service-details";
import AdminDashboard from "@/pages/admin-dashboard";
import Settings from "@/pages/settings";
import BuyCoinsPage from "@/pages/buy-coins";
import HelpCenter from "@/pages/help-center";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/profile/:userId?" component={ProfilePage} />
      <Route path="/job/:jobId" component={JobDetailsPage} />
      <Route path="/service/:serviceId" component={ServiceDetailsPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/buy-coins" component={BuyCoinsPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/help-center" component={HelpCenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <div className="flex-1">
                <Router />
              </div>
              <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center">
                  <p className="text-sm text-gray-500">
                    Jigz - Copyright © 2025 Xpo8 Limited - All rights reserved
                  </p>
                </div>
              </footer>
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
