"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function CreatePostForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError("Write something before posting");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You need to be logged in to create a post");
      }

      const { error: insertError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, content: trimmed });
      if (insertError) throw insertError;

      setSuccess("Your post was created!");
      setContent("");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a post</CardTitle>
          <CardDescription>Share something with the community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="content">Post</Label>
                <textarea
                  id="content"
                  rows={5}
                  required
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
