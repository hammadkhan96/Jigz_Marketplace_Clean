import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageCircle, User, Briefcase, Home, LogIn, UserPlus, LogOut, ChevronDown, Settings, Coins, Bell, HelpCircle, LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CoinDisplay } from "@/components/ui-components/coin-display";
import { SubscriptionBadge } from "@/components/ui-components/subscription-badge";

import JIGZ_LOGO_01__1_ from "@assets/JIGZ LOGO-01 (1).jpg";

export function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Get unread message count - only for authenticated users
  const { data: unreadData } = useQuery({
    queryKey: ["/api/user/unread-messages"],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isAuthenticated,
  });

  // Get unread notification count - only for authenticated users
  const { data: notificationData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isAuthenticated,
  });

  const unreadCount = (unreadData as { count: number })?.count || 0;
  const unreadNotificationCount = (notificationData as { count: number })?.count || 0;
  


  // Navigation items for authenticated users (excluding Profile which will be in dropdown)
  const authenticatedNavItems = [
    { href: "/", label: "Jobs", icon: Home },
    { href: "/services", label: "Services", icon: Briefcase },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: unreadCount },
    ...(user?.role === "admin" || user?.role === "moderator" ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  // Navigation items for non-authenticated users
  const publicNavItems = [
    { href: "/", label: "Browse Jobs", icon: Home },
    { href: "/services", label: "Browse Services", icon: Briefcase },
  ];

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img 
                src={JIGZ_LOGO_01__1_} 
                alt="Jigz Logo" 
                className="h-12 w-auto mt-[-5px] mb-[-5px] pt-[1px] pb-[1px] pl-[0px] pr-[0px] ml-[4px] mr-[4px] hidden sm:block"
              />

            </div>
          </Link>

          <nav className="flex items-center space-x-4">
            {isAuthenticated && <CoinDisplay />}
            
            <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              // Authenticated user navigation
              (<>
                {authenticatedNavItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className="relative flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={location.startsWith(`/profile/${user?.id}`) ? "default" : "ghost"}
                      size="sm"
                      className="relative flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Profile</span>
                      {unreadNotificationCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {unreadNotificationCount}
                        </Badge>
                      )}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-muted-foreground">{user?.email}</p>
                      <div className="mt-2">
                        <SubscriptionBadge userId={user?.id || ''} size="sm" />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href={`/profile/${user?.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/notifications">
                      <DropdownMenuItem className="cursor-pointer">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                        {unreadNotificationCount > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {unreadNotificationCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/buy-coins">
                      <DropdownMenuItem className="cursor-pointer">
                        <Coins className="h-4 w-4 mr-2" />
                        Buy Coins
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/help-center">
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Help Center
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      onClick={() => logout()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>)
            ) : (
              // Non-authenticated user navigation
              (<>
                {publicNavItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Button>
                </Link>
              </>)
            )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}