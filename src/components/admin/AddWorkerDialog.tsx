import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const addWorkerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Only letters, numbers, dots, underscores, and hyphens allowed"
    ),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/^\S+$/, "Password must not contain spaces"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AddWorkerFormData = z.infer<typeof addWorkerSchema>;

interface AddWorkerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddWorkerFormData) => void;
  isLoading: boolean;
}

/** Password strength indicators */
const PasswordRule = ({ label, met }: { label: string; met: boolean }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-600" : "text-muted-foreground"}`}>
    {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
    <span>{label}</span>
  </div>
);

export const AddWorkerDialog = ({ isOpen, onOpenChange, onSubmit, isLoading }: AddWorkerDialogProps) => {
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const form = useForm<AddWorkerFormData>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const username = form.watch("username");

  // Debounced username uniqueness check
  useEffect(() => {
    if (!username || username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", username)
          .maybeSingle();

        if (error) {
          setUsernameStatus("idle");
          return;
        }

        setUsernameStatus(data ? "taken" : "available");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = (data: AddWorkerFormData) => {
    if (usernameStatus === "taken") return;
    onSubmit(data);
    form.reset();
    setUsernameStatus("idle");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setUsernameStatus("idle");
    }
    onOpenChange(open);
  };

  // Password strength indicators
  const hasMinLength = (password?.length || 0) >= 8;
  const hasLetter = /[a-zA-Z]/.test(password || "");
  const hasNumber = /\d/.test(password || "");
  const hasNoSpaces = !/\s/.test(password || "") && (password?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Worker
        </Button>
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Worker</DialogTitle>
          <DialogDescription>
            Create a secure worker account with unique credentials
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter worker's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username — with real-time uniqueness indicator */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="e.g. john.doe"
                        autoComplete="off"
                        {...field}
                      />
                      {/* Status indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {usernameStatus === "available" && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {usernameStatus === "taken" && (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  {usernameStatus === "taken" && (
                    <p className="text-xs text-destructive font-medium">
                      This username is already taken
                    </p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-xs text-green-600 font-medium">
                      Username is available
                    </p>
                  )}
                  <FormDescription className="text-xs">
                    Letters, numbers, dots, underscores, hyphens only
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter worker's email" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Used for Google Sign-In linking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password — with strength indicators */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Create a strong password" {...field} />
                  </FormControl>
                  {/* Visual password strength */}
                  {password && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                      <PasswordRule label="8+ characters" met={hasMinLength} />
                      <PasswordRule label="Has a letter" met={hasLetter} />
                      <PasswordRule label="Has a number" met={hasNumber} />
                      <PasswordRule label="No spaces" met={hasNoSpaces} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || usernameStatus === "taken" || usernameStatus === "checking"}
              >
                {isLoading ? "Creating..." : "Create Worker"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};