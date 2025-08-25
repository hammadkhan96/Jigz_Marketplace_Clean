import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Star, X, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertReviewSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { SkillEndorsementModal } from "@/components/modals/skill-endorsement-modal";

interface ReviewError {
  message: string;
}

const reviewFormSchema = insertReviewSchema;

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  revieweeId: string;
  revieweeName: string;
  reviewType: "client_to_worker" | "worker_to_client";
  jobTitle?: string;
}

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  jobId, 
  revieweeId, 
  revieweeName,
  reviewType,
  jobTitle 
}: ReviewModalProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredQualityRating, setHoveredQualityRating] = useState(0);
  const [hoveredCommunicationRating, setHoveredCommunicationRating] = useState(0);
  const [hoveredTimelinessRating, setHoveredTimelinessRating] = useState(0);
  const [skillEndorsementModalOpen, setSkillEndorsementModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has already endorsed this person for this job
  const { data: endorsementStatus } = useQuery<{ hasEndorsed: boolean }>({
    queryKey: [`/api/jobs/${jobId}/has-endorsed/${revieweeId}`],
    enabled: isOpen && reviewType === "client_to_worker" && !!user?.id && !!jobId && !!revieweeId,
    retry: false,
  });

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      jobId,
      reviewerId: user?.id || "",
      revieweeId,
      rating: reviewType === "worker_to_client" ? 0 : 1, // Auto-set to 1 for client-to-worker (will be calculated)
      comment: "",
      reviewType,
      qualityOfWorkRating: reviewType === "client_to_worker" ? 0 : undefined,
      communicationRating: reviewType === "client_to_worker" ? 0 : undefined,
      timelinessRating: reviewType === "client_to_worker" ? 0 : undefined,
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: ReviewFormData) => {
      // Use different endpoint for worker-to-client reviews
      if (data.reviewType === "worker_to_client") {
        // Transform data for the rate-client endpoint - use props directly since form data may be empty
        const clientRatingData = {
          jobId: jobId, // Use the prop instead of form data
          clientId: revieweeId, // Use the prop instead of form data
          rating: data.rating,
          comment: data.comment,
        };

        return apiRequest("POST", "/api/reviews/rate-client", clientRatingData);
      } else {
        return apiRequest("POST", "/api/reviews", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: reviewType === "worker_to_client" 
          ? "Thank you for rating the client!" 
          : "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-rating-eligibility"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/rating-eligibility"] });
      queryClient.invalidateQueries({ queryKey: ["/api/freelancer-review-status"] });
      onClose();
      form.reset();
    },
    onError: (error: ReviewError) => {
      console.error("Review submission error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    // For worker-to-client reviews, require overall rating
    if (data.reviewType === "worker_to_client" && data.rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    // For client-to-worker reviews, require all detailed ratings and set overall rating to average
    if (data.reviewType === "client_to_worker") {
      if (!data.qualityOfWorkRating || !data.communicationRating || !data.timelinessRating) {
        toast({
          title: "Detailed ratings required",
          description: "Please rate all three aspects: Quality of Work, Communication & Professionalism, and Timeliness & Reliability.",
          variant: "destructive",
        });
        return;
      }
      // Calculate average rating from detailed ratings
      const averageRating = Math.round((data.qualityOfWorkRating + data.communicationRating + data.timelinessRating) / 3);
      data.rating = averageRating;
    }

    reviewMutation.mutate(data);
  };

  const rating = form.watch("rating");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Rate {reviewType === "client_to_worker" ? "Service Provider" : "Client"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Only show overall rating for worker-to-client reviews */}
          {reviewType === "worker_to_client" && (
            <div>
              <Label className="text-sm font-medium">
                How was your experience with {revieweeName}?
              </Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => form.setValue("rating", star)}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
                      )}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              )}
            </div>
          )}

          {/* Detailed ratings for client-to-freelancer reviews */}
          {reviewType === "client_to_worker" && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Rate {revieweeName} on the following aspects:</h3>
              
              {/* Quality of Work Rating */}
              <div>
                <Label className="text-sm">Quality of Work</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1"
                      onMouseEnter={() => setHoveredQualityRating(star)}
                      onMouseLeave={() => setHoveredQualityRating(0)}
                      onClick={() => form.setValue("qualityOfWorkRating", star)}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= (hoveredQualityRating || form.watch("qualityOfWorkRating") || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Communication & Professionalism Rating */}
              <div>
                <Label className="text-sm">Communication & Professionalism</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1"
                      onMouseEnter={() => setHoveredCommunicationRating(star)}
                      onMouseLeave={() => setHoveredCommunicationRating(0)}
                      onClick={() => form.setValue("communicationRating", star)}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= (hoveredCommunicationRating || form.watch("communicationRating") || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeliness & Reliability Rating */}
              <div>
                <Label className="text-sm">Timeliness & Reliability</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1"
                      onMouseEnter={() => setHoveredTimelinessRating(star)}
                      onMouseLeave={() => setHoveredTimelinessRating(0)}
                      onClick={() => form.setValue("timelinessRating", star)}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= (hoveredTimelinessRating || form.watch("timelinessRating") || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              Leave a comment (optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              className="mt-2"
              rows={4}
              {...form.register("comment")}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reviewMutation.isPending || 
                (reviewType === "worker_to_client" && rating === 0) ||
                (reviewType === "client_to_worker" && 
                 (!form.watch("qualityOfWorkRating") || !form.watch("communicationRating") || !form.watch("timelinessRating")))}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>

          {/* Endorse Skills Button - only for client-to-worker reviews */}
          {reviewType === "client_to_worker" && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">
                Want to highlight {revieweeName}'s specific skills? Endorse them for 5 coins.
              </p>
              {endorsementStatus?.hasEndorsed ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-full bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Already Endorsed
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSkillEndorsementModalOpen(true)}
                  className="w-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Endorse Skills
                </Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>

      <SkillEndorsementModal
        isOpen={skillEndorsementModalOpen}
        onClose={() => setSkillEndorsementModalOpen(false)}
        endorseeId={revieweeId}
        endorseeName={revieweeName}
        jobId={jobId}
        jobTitle={jobTitle || ""}
      />
    </>
  );
}