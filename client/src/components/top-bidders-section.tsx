import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, Medal, Award, CheckCircle } from "lucide-react";

interface TopBidder {
  name: string;
  coinsBid: number;
  isEmailVerified?: boolean;
}

interface TopBiddersSectionProps {
  jobId: string;
}

export function TopBiddersSection({ jobId }: TopBiddersSectionProps) {
  const { data: topBidders = [], isLoading } = useQuery<TopBidder[]>({
    queryKey: ['/api/jobs', jobId, 'top-bidders'],
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Top Priority Bidders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (topBidders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Priority Bidding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            <Coins className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No priority bids yet</p>
            <p className="text-sm">Be the first to bid coins for higher ranking!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300 text-xs flex items-center justify-center text-white font-bold">{index + 1}</div>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-50 border-yellow-200";
      case 1:
        return "bg-gray-50 border-gray-200";
      case 2:
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
          Top Priority Bidders
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Applicants who bid coins for higher ranking
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topBidders.slice(0, 5).map((bidder, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-3 rounded-lg border ${getRankColor(index)}`}
            >
              <div className="flex items-center space-x-3">
                {getRankIcon(index)}
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">{bidder.name}</span>
                    {bidder.isEmailVerified && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Rank #{index + 1}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" />
                {bidder.coinsBid} coin{bidder.coinsBid !== 1 ? 's' : ''}
              </Badge>
            </div>
          ))}
        </div>
        
        {topBidders.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <Coins className="h-3 w-3 inline mr-1" />
              Higher coin bids appear first in the applicant list for better visibility
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}