
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
  defaultEmail?: string;
  isLoading?: boolean;
}

export const EmailDialog = ({ 
  isOpen, 
  onClose, 
  onSend, 
  defaultEmail = "",
  isLoading = false 
}: EmailDialogProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      await onSend(email);
      onClose();
      setEmail("");
      setError("");
    } catch (error) {
      // Error is handled in the parent component
    }
  };

  const handleClose = () => {
    onClose();
    setEmail("");
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Send Quotation via Email
          </DialogTitle>
          <DialogDescription>
            Enter the customer's email address to send the quotation PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
