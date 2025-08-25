import { useQuery } from "@tanstack/react-query";
import { Coins, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface CoinBalance {
  coins: number;
  lastReset: string;
  daysUntilReset: number;
}

export function CoinDisplay() {
  const [, setLocation] = useLocation();
  const { data: coinData, isLoading } = useQuery<CoinBalance>({
    queryKey: ["/api/user/coins"],
  });

  if (isLoading || !coinData) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Coins className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const isLowCoins = coinData.coins < 3;

  const handleClick = () => {
    setLocation("/buy-coins");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center space-x-2 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${
              isLowCoins ? 'text-red-600' : 'text-gray-700'
            }`}
            onClick={handleClick}
          >
            <Coins className={`h-4 w-4 ${isLowCoins ? 'text-red-500' : 'text-yellow-500'}`} />
            <span>
              <span className="md:hidden">{coinData.coins}</span>
              <span className="hidden md:inline">{coinData.coins} coins</span>
            </span>
            <InfoIcon className="h-3 w-3 text-gray-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2 text-sm">
            <p><strong>Coin System:</strong></p>
            <p>• Job posting: 3 coins</p>
            <p>• Job application: 1 coin</p>
            <p>• Monthly coins: 20 coins</p>
            <p>• Days until reset: {coinData.daysUntilReset}</p>
            {isLowCoins && (
              <Badge variant="destructive" className="mt-2">
                Low coins - earn more by completing jobs!
              </Badge>
            )}
            <p className="text-xs text-gray-500 mt-2">Click to buy more coins</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CoinWarning({ coinsNeeded, coinsAvailable }: { coinsNeeded: number; coinsAvailable: number }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 text-red-800 mb-2">
        <Coins className="h-5 w-5" />
        <span className="font-semibold">Insufficient Coins</span>
      </div>
      <p className="text-red-700 text-sm mb-3">
        You need {coinsNeeded} coins but only have {coinsAvailable} coins available.
      </p>
      <div className="text-sm text-red-600 space-y-1">
        <p>• Monthly coins: 20 coins for users, 100 for admins</p>
        <p>• Complete jobs to earn more coins</p>
        <p>• Job posting costs 3 coins</p>
        <p>• Service posting costs 20 coins</p>
        <p>• Job application costs 1 coin</p>
      </div>
    </div>
  );
}