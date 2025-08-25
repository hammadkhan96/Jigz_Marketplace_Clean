import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, TrendingUp, Info } from "lucide-react";
import type { ApplicationWithJob } from "@shared/schema";
import { CoinWarning } from "@/components/ui-components/coin-display";

interface BidError {
  message: string;
  coinsNeeded?: number;
  coinsAvailable?: number;
}

interface BidManagementProps {
  application: ApplicationWithJob;
}

export function BidManagement({ application }: BidManagementProps) {
  const [additionalCoins, setAdditionalCoins] = useState<number>(1);
  const [coinError, setCoinError] = useState<{ coinsNeeded: number; coinsAvailable: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const increaseBidMutation = useMutation({
    mutationFn: async (data: { additionalCoins: number }) => {
      const res = await apiRequest("POST", `/api/applications/${application.id}/bid`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", application.jobId, "application-rankings"] });
      setCoinError(null);
      toast({
        title: "Bid Increased",
        description: `Added ${additionalCoins} coins to your bid. Your application now has higher priority!`,
      });
      setAdditionalCoins(1);
    },
    onError: (error: BidError) => {
      console.error("Error increasing bid:", error);
      
      // Check if it's a coin-related error
      if (error.coinsNeeded && error.coinsAvailable !== undefined) {
        setCoinError({
          coinsNeeded: error.coinsNeeded,
          coinsAvailable: error.coinsAvailable
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to increase bid. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleIncreaseBid = () => {
    if (additionalCoins < 1) {
      toast({
        title: "Invalid Amount",
        description: "You must bid at least 1 additional coin.",
        variant: "destructive",
      });
      return;
    }
    increaseBidMutation.mutate({ additionalCoins });
  };

  const currentBid = application.coinsBid || 0;
  const isApplicationPending = application.status === 'pending';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          Priority Bidding
          {currentBid > 0 && (
            <Badge variant="secondary" className="ml-auto">
              <Coins className="h-3 w-3 mr-1" />
              {currentBid} coins
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {coinError && (
          <CoinWarning 
            coinsNeeded={coinError.coinsNeeded} 
            coinsAvailable={coinError.coinsAvailable} 
          />
        )}
        
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">How Priority Bidding Works:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Higher bids rank your application at the top</li>
              <li>Clients see top bidders first</li>
              <li>Coins are spent immediately when bid is placed</li>
            </ul>
          </div>
        </div>

        {currentBid === 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600 mb-2">
              No priority bid placed yet
            </p>
            <Badge variant="outline" className="text-xs">
              Standard ranking
            </Badge>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700">
              <Coins className="h-4 w-4" />
              Current bid: {currentBid} coins
            </div>
            <Badge variant="default" className="text-xs mt-1">
              Priority ranking active ⚡
            </Badge>
          </div>
        )}

        {isApplicationPending && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="additionalCoins" className="text-sm">
                Add More Coins to Bid
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="additionalCoins"
                  type="number"
                  min="1"
                  value={additionalCoins}
                  onChange={(e) => setAdditionalCoins(parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleIncreaseBid}
                  disabled={increaseBidMutation.isPending}
                  size="sm"
                  className="px-4"
                >
                  {increaseBidMutation.isPending ? "Adding..." : "Add Bid"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                New total bid: {currentBid + additionalCoins} coins
              </p>
            </div>
          </div>
        )}

        {!isApplicationPending && (
          <div className="text-center py-2">
            <p className="text-xs text-gray-500">
              Bidding is only available for pending applications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}