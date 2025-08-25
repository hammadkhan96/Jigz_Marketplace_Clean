import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins } from "lucide-react";
import { CategorySearch } from "@/components/category-search";

interface SkillEndorsementModalProps {
  isOpen: boolean;
  onClose: () => void;
  endorseeId: string;
  endorseeName: string;
  jobId: string;
  jobTitle: string;
}

export function SkillEndorsementModal({
  isOpen,
  onClose,
  endorseeId,
  endorseeName,
  jobId,
  jobTitle,
}: SkillEndorsementModalProps) {
  const [skill, setSkill] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createEndorsementMutation = useMutation({
    mutationFn: async (data: { endorseeId: string; jobId: string; skill: string; message?: string }) => {
      const response = await apiRequest("POST", "/api/skill-endorsements", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create endorsement");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Skill Endorsed!",
        description: `You have successfully endorsed ${endorseeName} for their ${skill} skills.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${endorseeId}/skill-endorsements`] });
      queryClient.invalidateQueries({ queryKey: ["/api/endorsement-statuses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/has-endorsed/${endorseeId}`] });
      onClose();
      setSkill("");
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Endorsement Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!skill.trim()) {
      toast({
        title: "Skill Required",
        description: "Please specify the skill you want to endorse.",
        variant: "destructive",
      });
      return;
    }

    createEndorsementMutation.mutate({
      endorseeId,
      jobId,
      skill: skill.trim(),
      message: message.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Endorse {endorseeName}</DialogTitle>
          <DialogDescription>
            Endorse {endorseeName} for their work on "{jobTitle}". This costs 5 coins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill">Skill Category to Endorse *</Label>
            <CategorySearch
              value={skill}
              onValueChange={setSkill}
              placeholder="Select or search for a skill category..."
              includeAllCategories={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Optional Message</Label>
            <Textarea
              id="message"
              placeholder="Add a brief message about their work quality..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              This endorsement will cost 5 coins
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createEndorsementMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createEndorsementMutation.isPending || !skill.trim()}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {createEndorsementMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Endorsing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Endorse for 5 Coins
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}