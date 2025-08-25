import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Coins, Trophy, Medal, Award, CheckCircle } from "lucide-react";
import type { ApplicationWithUser } from "@shared/schema";

interface ApplicationRankingsProps {
  jobId: string;
}

interface RankedApplication extends ApplicationWithUser {
  rank: number;
  isBidding: boolean;
}

export function ApplicationRankings({ jobId }: ApplicationRankingsProps) {
  const { data: applications, isLoading } = useQuery<RankedApplication[]>({
    queryKey: ["/api/jobs", jobId, "application-rankings"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Application Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Application Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No applications yet</p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs font-medium text-gray-500">#{rank}</span>;
    }
  };

  const getBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Application Rankings
          <Badge variant="secondary" className="ml-auto">
            {applications.length} applicant{applications.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {applications.map((application) => (
          <div
            key={application.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              application.rank <= 3 
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8">
              {getRankIcon(application.rank)}
            </div>
            
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={application.user.profileImageUrl || undefined} 
                alt={application.user.name}
              />
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm truncate">
                  {application.user.name}
                </p>
                {application.user.isEmailVerified && (
                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                ${application.bidAmount} • {new Date(application.createdAt!).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {application.isBidding && (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                  <Coins className="h-3 w-3" />
                  {application.coinsBid}
                </div>
              )}
              
              <Badge variant={getBadgeVariant(application.rank)} className="text-xs">
                {application.status === 'accepted' ? 'Hired' : 
                 application.status === 'rejected' ? 'Declined' : 'Pending'}
              </Badge>
            </div>
          </div>
        ))}
        
        {applications.some(app => app.isBidding) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <Coins className="h-4 w-4" />
              <span className="font-medium">Priority Bidding Active</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Applicants with higher coin bids appear at the top for better visibility.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}