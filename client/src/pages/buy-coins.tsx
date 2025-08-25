import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CheckCircle, Star, Briefcase, PlusCircle, Calculator, Zap } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { SUBSCRIPTION_PLANS, CoinSubscription, SubscriptionPlanType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CoinPackage {
  coins: number;
  price: number;
  label: string;
  description: string;
  popular?: boolean;
}

// Payment and subscription related interfaces
interface PaymentError {
  message: string;
  type?: string;
  code?: string;
}

interface SubscriptionMutationError {
  message: string;
}

interface UserCoinsResponse {
  coins: number;
}

interface UserSubscriptionResponse {
  subscription: CoinSubscription | null;
}

interface SubscriptionPackages {
  [key: string]: CoinPackage;
}

// Tiered pricing function for custom coin purchases
const calculateTieredPrice = (coins: number): number => {
  let totalPrice = 0;
  let remainingCoins = coins;
  
  // First 100 coins at $0.20 each
  if (remainingCoins > 0) {
    const tier1Coins = Math.min(remainingCoins, 100);
    totalPrice += tier1Coins * 0.20;
    remainingCoins -= tier1Coins;
  }
  
  // Next 200 coins (100-300) at $0.15 each
  if (remainingCoins > 0) {
    const tier2Coins = Math.min(remainingCoins, 200);
    totalPrice += tier2Coins * 0.15;
    remainingCoins -= tier2Coins;
  }
  
  // Next 200 coins (300-500) at $0.10 each
  if (remainingCoins > 0) {
    const tier3Coins = Math.min(remainingCoins, 200);
    totalPrice += tier3Coins * 0.10;
    remainingCoins -= tier3Coins;
  }
  
  // Remaining coins (500-1000) at $0.08 each
  if (remainingCoins > 0) {
    totalPrice += remainingCoins * 0.08;
  }
  
  return totalPrice;
};

// Get pricing breakdown for display
const getPricingBreakdown = (coins: number) => {
  const breakdown = [];
  let remainingCoins = coins;
  
  if (remainingCoins > 0) {
    const tier1Coins = Math.min(remainingCoins, 100);
    breakdown.push({ coins: tier1Coins, rate: 0.20, total: tier1Coins * 0.20, range: "1-100" });
    remainingCoins -= tier1Coins;
  }
  
  if (remainingCoins > 0) {
    const tier2Coins = Math.min(remainingCoins, 200);
    breakdown.push({ coins: tier2Coins, rate: 0.15, total: tier2Coins * 0.15, range: "101-300" });
    remainingCoins -= tier2Coins;
  }
  
  if (remainingCoins > 0) {
    const tier3Coins = Math.min(remainingCoins, 200);
    breakdown.push({ coins: tier3Coins, rate: 0.10, total: tier3Coins * 0.10, range: "301-500" });
    remainingCoins -= tier3Coins;
  }
  
  if (remainingCoins > 0) {
    breakdown.push({ coins: remainingCoins, rate: 0.08, total: remainingCoins * 0.08, range: "501-1000" });
  }
  
  return breakdown;
};

const CheckoutForm = ({ selectedPackage, onSuccess }: { selectedPackage: string, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Instead of using confirmPayment with redirect, use confirmPayment without redirect
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/buy-coins?success=true`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Manually trigger coin addition since we don't have webhooks in development
        try {
          await apiRequest("POST", "/api/coins/complete-purchase", {
            paymentIntentId: paymentIntent.id
          });
          
          toast({
            title: isCustomPurchase ? "Purchase Complete!" : "Subscription Activated!",
            description: isCustomPurchase ? "Your coins have been added to your account!" : "Your monthly coins have been added to your account!",
          });
          onSuccess();
        } catch (err) {
          toast({
            title: isCustomPurchase ? "Purchase Processed" : "Subscription Processed",
            description: isCustomPurchase ? "Purchase successful! Your coins will be added shortly." : "Subscription successful! Your coins will be added shortly.",
          });
          onSuccess();
        }
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const isCustomPurchase = selectedPackage === "custom";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? "Processing..." : (isCustomPurchase ? "Complete Purchase" : "Start Monthly Subscription")}
      </Button>
    </form>
  );
};

export default function BuyCoins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customCoins, setCustomCoins] = useState([100]);
  const [activeTab, setActiveTab] = useState("subscriptions");

  // Check for success parameter in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Subscription Successful!",
        description: "Your monthly coins have been added to your account.",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, "/buy-coins");
      // Refresh user coins and subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coins/subscription"] });
    }
  }, [toast, queryClient]);

  // Get subscription plans
  const { data: packages } = useQuery<SubscriptionPackages>({
    queryKey: ["/api/coins/subscription-plans"],
  });

  // Get user's coins
  const { data: userCoins } = useQuery({
    queryKey: ["/api/user/coins"],
    enabled: !!user,
  });

  // Get user's active subscription
  const { data: userSubscription } = useQuery({
    queryKey: ["/api/coins/subscription"],
    enabled: !!user,
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planType: string) => {
      const response = await apiRequest("POST", "/api/coins/create-subscription", { planType });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      toast({
        title: "Subscription Ready",
        description: `Ready to subscribe for ${data.coins} coins monthly at $${(data.price / 100).toFixed(2)}/month`,
      });
    },
    onError: (error: SubscriptionMutationError) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  // Create one-time purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (coins: number) => {
      const response = await apiRequest("POST", "/api/coins/create-payment-intent", { 
        amount: calculateTieredPrice(coins), // Use tiered pricing
        coins: coins // Pass the coin count as well
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      toast({
        title: "Payment Ready",
        description: `Ready to purchase ${customCoins[0]} coins for $${calculateTieredPrice(customCoins[0]).toFixed(2)}`,
      });
    },
    onError: (error: SubscriptionMutationError) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  // Change subscription plan mutation
  const changeSubscriptionMutation = useMutation({
    mutationFn: async (newPlanType: string) => {
      const response = await apiRequest("POST", "/api/coins/change-subscription", { newPlanType });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.type === "upgrade" && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setSelectedPackage(data.newPlan.toLowerCase());
        toast({
          title: "Upgrade Ready",
          description: `Pay $${(data.proratedAmount / 100).toFixed(2)} to upgrade to ${data.newPlan} immediately`,
        });
      } else if (data.type === "downgrade") {
        toast({
          title: "Plan Change Scheduled",
          description: `Your plan will change to ${data.newPlan} on ${new Date(data.effectiveDate).toLocaleDateString()}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/coins/subscription"] });
      } else if (data.type === "upgrade" && data.effectiveImmediately) {
        toast({
          title: "Plan Upgraded!",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/coins/subscription"] });
      }
    },
    onError: (error: SubscriptionMutationError) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change plan",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/coins/cancel-subscription");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Canceled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coins/subscription"] });
    },
    onError: (error: SubscriptionMutationError) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planKey: string) => {
    const subscription = userSubscription && typeof userSubscription === 'object' && 'subscription' in userSubscription ? (userSubscription as UserSubscriptionResponse).subscription : null;
    if (subscription) {
      // User has active subscription, change plan
      changeSubscriptionMutation.mutate(planKey);
    } else {
      // No active subscription, create new one
      setSelectedPackage(planKey);
      setActiveTab("subscriptions");
      createSubscriptionMutation.mutate(planKey);
    }
  };

  const handleCustomPurchase = () => {
    setSelectedPackage("custom");
    setActiveTab("custom");
    createPurchaseMutation.mutate(customCoins[0]);
  };

  const handlePaymentSuccess = () => {
    setSelectedPackage(null);
    setClientSecret(null);
    // Refresh user coins and subscription data
    queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/coins/subscription"] });
    toast({
      title: "Coins Added!",
      description: "Your new coins are now available in your account.",
    });
  };

  if (selectedPackage && clientSecret) {
    const packageInfo = packages?.[selectedPackage as keyof typeof packages] as CoinPackage | undefined;
    const isCustom = selectedPackage === "custom";
    
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              {isCustom ? "Complete Your Purchase" : "Complete Your Subscription"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isCustom 
                ? `${customCoins[0]} coins for $${calculateTieredPrice(customCoins[0]).toFixed(2)}`
                : `${packageInfo?.coins} coins monthly for $${((packageInfo?.price || 0) / 100).toFixed(2)}/month`
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                {isCustom ? "Custom Purchase" : packageInfo?.label}
              </CardTitle>
              <CardDescription>
                {isCustom ? "One-time coin purchase" : packageInfo?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm 
                  selectedPackage={selectedPackage} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedPackage(null);
                setClientSecret(null);
              }}
            >
              Back to Options
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-8 px-4">
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold">Buy Coins</h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">
          Power your freelance career with our flexible coin options
        </p>
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 px-3 md:px-4 py-2 rounded-lg">
            <Coins className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            <span className="text-blue-800 font-medium text-sm md:text-base">
              Current balance: {userCoins && typeof userCoins === 'object' && 'coins' in userCoins ? (userCoins as UserCoinsResponse).coins : 0} coins
            </span>
          </div>
        )}
      </div>

      {/* Coin Usage Information */}
      <div className="max-w-4xl mx-auto mb-8 md:mb-12">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-blue-800 text-lg md:text-xl">
              <Calculator className="h-5 w-5 md:h-6 md:w-6" />
              What You Can Do With Coins
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">Job Applications</h3>
                <p className="text-gray-600 text-sm mb-2">1 coin per application</p>
                <div className="text-xs text-gray-500">
                  <p>✓ Apply to any job</p>
                  <p>✓ No application limits</p>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-orange-100 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PlusCircle className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">Post Jobs</h3>
                <p className="text-gray-600 text-sm mb-2">3 coins per job post</p>
                <div className="text-xs text-gray-500">
                  <p>✓ Reach qualified freelancers</p>
                  <p>✓ Quality job posting system</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-6 md:mb-8">
          <TabsList className="inline-flex bg-gradient-to-r from-gray-100 to-gray-200 p-1 rounded-xl shadow-lg w-full max-w-md md:w-auto">
            <TabsTrigger 
              value="subscriptions" 
              className="flex-1 md:flex-none px-3 md:px-9 py-2 md:py-3 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50"
            >
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Zap className="h-2 w-2 md:h-4 md:w-4 text-white" />
                </div>
                <span className="font-medium text-xs md:text-sm">Monthly Subscriptions</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="custom" 
              className="flex-1 md:flex-none px-3 md:px-9 py-2 md:py-3 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50"
            >
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Coins className="h-2 w-2 md:h-4 md:w-4 text-white" />
                </div>
                <span className="font-medium text-xs md:text-sm">One-Time Purchase</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="subscriptions" className="space-y-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Monthly Subscription Plans</h2>
            <p className="text-gray-600">Get fresh coins delivered monthly - cancel anytime</p>
          </div>

          {/* Show active subscription status if user has one */}
          {(() => {
            const subscription = userSubscription && typeof userSubscription === 'object' && 'subscription' in userSubscription ? (userSubscription as UserSubscriptionResponse).subscription : null;
            if (!subscription) return null;
            
            return (
            <div className="max-w-2xl mx-auto mb-8">
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-6 w-6" />
                      Active Subscription
                    </CardTitle>
                    {subscription.status !== "canceled" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelSubscriptionMutation.mutate()}
                          disabled={cancelSubscriptionMutation.isPending}
                          className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                        >
                          {cancelSubscriptionMutation.isPending ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                              Canceling...
                            </div>
                          ) : (
                            "Cancel Subscription"
                          )}
                        </Button>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-green-600 mb-1">Plan</div>
                      <div className="font-semibold capitalize">{subscription.planType || ''}</div>
                    </div>
                    <div>
                      <div className="text-sm text-green-600 mb-1">Monthly Coins</div>
                      <div className="font-semibold">{subscription.coinAllocation || ''}</div>
                    </div>
                    <div>
                      <div className="text-sm text-green-600 mb-1">Next Billing</div>
                      <div className="font-semibold">
                        {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {subscription.status === "canceled" && subscription.canceledAt && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-red-800 font-medium mb-1">Subscription Canceled</p>
                      <p className="text-red-700 text-sm">
                        Canceled on {subscription.canceledAt ? new Date(subscription.canceledAt).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-red-700 text-sm">
                        Access continues until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            );
          })()}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {(() => {
              if (!packages) return null;
              return Object.entries(packages).map(([key, pkg]: [string, CoinPackage]) => {
              const packageInfo = pkg;
              const applicationsPerMonth = SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "∞" : packageInfo.coins;
              const jobPostsPerMonth = SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "∞" : Math.floor(packageInfo.coins / 3);
              const subscription = userSubscription && typeof userSubscription === 'object' && 'subscription' in userSubscription ? (userSubscription as UserSubscriptionResponse).subscription : null;
              const hasActiveSubscription = !!subscription;
              const isCurrentPlan = subscription ? subscription.planType === key : false;
              const currentPlanPrice = (subscription && subscription.planType && packages && packages[subscription.planType]) ? packages[subscription.planType].price : 0;
              const isUpgrade = hasActiveSubscription && packageInfo.price > currentPlanPrice;
              const isDowngrade = hasActiveSubscription && packageInfo.price < currentPlanPrice;
              
              return (
                <Card 
                  key={key} 
                  className={`relative transition-all duration-300 group cursor-pointer ${
                    isCurrentPlan 
                      ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : packageInfo.popular && !hasActiveSubscription
                        ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-xl hover:scale-105' 
                        : 'hover:border-blue-300 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:scale-105'
                  }`}
                  onClick={() => handlePlanSelect(key)}
                >
                  {isCurrentPlan ? (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1.5 shadow-lg whitespace-nowrap">
                        <CheckCircle className="h-3 w-3 mr-1 fill-current" />
                        Current Plan
                      </Badge>
                    </div>
                  ) : packageInfo.popular && !hasActiveSubscription && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1.5 shadow-lg whitespace-nowrap">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-3 md:pb-4 pt-4 md:pt-6">
                    <div className={`mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 md:mb-3 ${
                      packageInfo.popular 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-blue-200'
                    } transition-all duration-300`}>
                      <Coins className={`h-6 w-6 md:h-8 md:w-8 ${
                        packageInfo.popular ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <CardTitle className="text-lg md:text-xl font-bold mb-1">
                      {packageInfo.label}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground md:text-sm opacity-80 text-[16px]">
                      {SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "Unlimited coins monthly" : `${packageInfo.coins} coins monthly`}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center pt-0 px-3 md:px-6">
                    <div className="mb-4 md:mb-6">
                      <div className="text-2xl md:text-4xl font-bold mb-1">
                        ${(packageInfo.price / 100).toFixed(2)}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">/month</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "Unlimited value" : `$${((packageInfo.price / 100) / packageInfo.coins).toFixed(3)} per coin`}
                      </div>
                    </div>
                    
                    <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                      <div className={`p-2 md:p-3 rounded-lg ${
                        packageInfo.popular 
                          ? 'bg-white/60' 
                          : 'bg-blue-50/80 group-hover:bg-blue-100/80'
                      } transition-all duration-300`}>
                        <div className="flex items-center justify-between text-xs md:text-sm">
                          <span className="text-gray-700 flex items-center gap-1 md:gap-2">
                            <Briefcase className="h-3 w-3 md:h-4 md:w-4" />
                            Applications
                          </span>
                          <span className="font-bold text-blue-600">{applicationsPerMonth}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm mt-1 md:mt-2">
                          <span className="text-gray-700 flex items-center gap-1 md:gap-2">
                            <PlusCircle className="h-3 w-3 md:h-4 md:w-4" />
                            Job Posts
                          </span>
                          <span className="font-bold text-green-600">{jobPostsPerMonth}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm mt-1 md:mt-2">
                          <span className="text-gray-700 flex items-center gap-1 md:gap-2">
                            <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V18C18 19.1 17.1 20 16 20H8C6.9 20 6 19.1 6 18V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2ZM16 8V18H8V8H16ZM9 10V12H11V10H9ZM13 10V12H15V10H13ZM9 14V16H11V14H9ZM13 14V16H15V14H13Z" fill="currentColor"/>
                            </svg>
                            Service Posts
                          </span>
                          <span className="font-bold text-orange-600">{SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "∞" : Math.floor(packageInfo.coins / 15)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm mt-1 md:mt-2">
                          <span className="text-gray-700 flex items-center gap-1 md:gap-2">
                            <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                            </svg>
                            Profile Badge
                          </span>
                          <span className="font-bold text-purple-600">✓</span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm mt-1 md:mt-2">
                          <span className="text-gray-700 flex items-center gap-1 md:gap-2">
                            <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V18C18 19.1 17.1 20 16 20H8C6.9 20 6 19.1 6 18V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 4V6H12V4ZM8 8V18H16V8H8ZM11 10H13V12H15V14H13V16H11V14H9V12H11V10Z" fill="currentColor"/>
                            </svg>
                            Coin Cap
                          </span>
                          <span className="font-bold text-blue-600">
                            {SUBSCRIPTION_PLANS[key as keyof typeof SUBSCRIPTION_PLANS].hasUnlimitedCoinCap ? "∞" : `${
                              key === 'freelancer' ? '100' :
                              key === 'professional' ? '400' :
                              key === 'expert' ? '1000' :
                              key === 'elite' ? '5000' : '40'
                            }`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className={`w-full transition-all duration-300 ${
                        isCurrentPlan
                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg'
                          : isUpgrade
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg'
                            : isDowngrade
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg'
                              : packageInfo.popular 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg' 
                                : 'group-hover:bg-blue-500 group-hover:text-white'
                      }`}
                      variant={isCurrentPlan || isUpgrade || isDowngrade || packageInfo.popular ? "default" : "outline"}
                      disabled={isCurrentPlan || createSubscriptionMutation.isPending || changeSubscriptionMutation.isPending}
                      size="lg"
                    >
                      {(createSubscriptionMutation.isPending || changeSubscriptionMutation.isPending) ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : isCurrentPlan ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Active Plan
                        </div>
                      ) : isUpgrade ? (
                        "Upgrade Now"
                      ) : isDowngrade ? (
                        "Downgrade Plan"
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
              });
            })()}
          </div>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6 md:space-y-8">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Custom Coin Purchase</h2>
            <p className="text-gray-600 text-sm md:text-base">Buy exactly what you need with one-time payments</p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg">
              <CardHeader className="text-center pb-4 md:pb-6">
                <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 md:mb-4">
                  <Calculator className="h-8 w-8 md:h-10 md:w-10 text-white" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold">
                  Custom Coin Purchase
                </CardTitle>
                <CardDescription className="text-sm md:text-base px-2">
                  Tiered pricing: $0.20 (1-100) • $0.15 (101-300) • $0.10 (301-500) • $0.08 (501-1000)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <Label htmlFor="coin-slider" className="text-base md:text-lg font-semibold">
                      Coins: {customCoins[0]}
                    </Label>
                    <div className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
                      ${calculateTieredPrice(customCoins[0]).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="px-2 md:px-4">
                    <Slider
                      id="coin-slider"
                      min={10}
                      max={1000}
                      step={10}
                      value={customCoins}
                      onValueChange={setCustomCoins}
                      className="mt-4"
                    />
                    <div className="flex justify-between text-xs md:text-sm text-gray-500 mt-2">
                      <span>10 coins (${calculateTieredPrice(10).toFixed(2)})</span>
                      <span>1000 coins (${calculateTieredPrice(1000).toFixed(2)})</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800 text-sm md:text-base">Job Applications</h4>
                        <p className="text-xs md:text-sm text-green-600">1 coin each</p>
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-green-700">
                      {customCoins[0]} applications
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <PlusCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 text-sm md:text-base">Job Posts</h4>
                        <p className="text-xs md:text-sm text-blue-600">3 coins each</p>
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-blue-700">
                      {Math.floor(customCoins[0] / 3)} posts
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-3 md:p-4 rounded-lg">
                  <div className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 text-center font-medium">Pricing Breakdown</div>
                  <div className="space-y-1 md:space-y-2">
                    {getPricingBreakdown(customCoins[0]).map((tier, index) => (
                      <div key={index} className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-gray-700">
                          Coins {tier.range}: {tier.coins} × ${tier.rate.toFixed(2)}
                        </span>
                        <span className="font-semibold">${tier.total.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 md:pt-2 mt-1 md:mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm md:text-base">Total</span>
                        <span className="font-bold text-base md:text-lg text-blue-600">${calculateTieredPrice(customCoins[0]).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300" 
                  onClick={handleCustomPurchase}
                  disabled={createPurchaseMutation.isPending}
                  size="lg"
                >
                  {createPurchaseMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base">Buy {customCoins[0]} Coins for ${calculateTieredPrice(customCoins[0]).toFixed(2)}</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="max-w-4xl mx-auto mt-16 text-center">
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-xl">How Our Coin System Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  For Freelancers
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Apply to jobs for 1 coin each</li>
                  <li>• Post jobs for 3 coins each</li>
                  <li>• Monthly subscriptions include fresh coins</li>
                  <li>• Free tier: 40 coin cap, Paid plans: 100-5000 coin caps</li>
                  <li>• Cancel anytime with no penalties</li>
                  <li>• Keep unused coins when you cancel</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-green-600" />
                  For Clients
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Post jobs for 3 coins each</li>
                  <li>• No fees for hiring freelancers</li>
                  <li>• Access to motivated, serious freelancers</li>
                  <li>• Free tier: 40 coin cap, Paid plans: 100-5000 coin caps</li>
                  <li>• Built-in quality control through coin system</li>
                  <li>• Simple application review process</li>
                </ul>
              </div>
            </div>
            <Separator className="my-6" />
            <p className="text-sm text-gray-500">
              Secure payments powered by Stripe • Cancel anytime • 24/7 customer support
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}