import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanType, type CoinSubscription } from "@shared/schema";
import { Crown, Star, Briefcase, Rocket } from "lucide-react";

interface SubscriptionBadgeProps {
  userId: string;
  size?: "sm" | "default" | "lg";
  showName?: boolean;
}

const PLAN_ICONS = {
  freelancer: Star,
  professional: Briefcase,
  expert: Rocket,
  elite: Crown,
};

export function SubscriptionBadge({ userId, size = "default", showName = true }: SubscriptionBadgeProps) {
  const { data: subscriptionData } = useQuery<{ subscription: CoinSubscription | null }>({
    queryKey: ["/api/user", userId, "subscription"],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}/subscription`);
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return response.json();
    },
    retry: false,
  });

  const subscription = subscriptionData?.subscription;
  
  // Don't render anything if user has no active subscription
  if (!subscription || subscription.status !== "active") {
    return null;
  }

  const planType = subscription.planType as SubscriptionPlanType;
  const plan = SUBSCRIPTION_PLANS[planType];
  
  if (!plan) {
    return null;
  }

  const IconComponent = PLAN_ICONS[planType];
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${plan.color} ${sizeClasses[size]} flex items-center gap-1.5 font-medium`}
    >
      <IconComponent className={iconSizes[size]} />
      {showName && plan.name}
    </Badge>
  );
}