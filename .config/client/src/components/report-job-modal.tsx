import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Flag, AlertTriangle, Mail, EyeOff, Users, Shield, MoreHorizontal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReportJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

const reportCategories = [
  {
    value: "spam",
    label: "Spam or Fake Job",
    description: "This job appears to be spam, fake, or misleading",
    icon: Mail
  },
  {
    value: "inappropriate",
    label: "Inappropriate Content",
    description: "Contains offensive, adult, or inappropriate content",
    icon: EyeOff
  },
  {
    value: "discriminatory",
    label: "Discriminatory",
    description: "Contains discriminatory language or requirements",
    icon: Users
  },
  {
    value: "unsafe",
    label: "Unsafe or Illegal",
    description: "Promotes unsafe practices or illegal activities",
    icon: Shield
  },
  {
    value: "fake",
    label: "Fraudulent",
    description: "This appears to be a scam or fraudulent job posting",
    icon: AlertTriangle
  },
  {
    value: "other",
    label: "Other",
    description: "Something else that violates community guidelines",
    icon: MoreHorizontal
  }
];

export function ReportJobModal({ isOpen, onClose, jobId, jobTitle }: ReportJobModalProps) {
  const [category, setCategory] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a report category.",
        variant: "destructive"
      });
      return;
    }
    
    if (reason.trim().length < 10) {
      toast({
        title: "Reason Required",
        description: "Please provide a detailed reason (minimum 10 characters).",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", `/api/jobs/${jobId}/reports`, {
        category,
        reason: reason.trim()
      });

      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it promptly."
      });
      
      // Invalidate job-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/search/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "reports", "check"] });
      
      onClose();
      setCategory("");
      setReason("");
    } catch (error: any) {
      toast({
        title: "Report Failed",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setCategory("");
      setReason("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Job
          </DialogTitle>
          <DialogDescription>
            Report "{jobTitle}" for violating community guidelines. Your report will be reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Why are you reporting this job?</Label>
            <RadioGroup value={category} onValueChange={setCategory} className="mt-3">
              {reportCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div key={cat.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={cat.value} id={cat.value} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={cat.value} className="font-medium cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Additional Details
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide specific details about why you're reporting this job (minimum 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 characters (minimum 10 required)
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !category || reason.trim().length < 10}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}