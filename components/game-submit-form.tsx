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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB

function isRobloxGameUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === "roblox.com" || host.endsWith(".roblox.com")) &&
      url.pathname.startsWith("/games/")
    );
  } catch {
    return false;
  }
}

export function GameSubmitForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [robloxUrl, setRobloxUrl] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isRobloxGameUrl(robloxUrl)) {
      setError(
        "Enter a Roblox game link, like https://www.roblox.com/games/123456",
      );
      return;
    }
    if (thumbnail && !thumbnail.type.startsWith("image/")) {
      setError("The thumbnail must be an image file");
      return;
    }
    if (thumbnail && thumbnail.size > MAX_THUMBNAIL_BYTES) {
      setError("The thumbnail must be 5 MB or smaller");
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
        throw new Error("You need to be logged in to submit a game");
      }

      let thumbnailUrl: string | null = null;
      if (thumbnail) {
        const ext = thumbnail.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(path, thumbnail, { contentType: thumbnail.type });
        if (uploadError) throw uploadError;
        thumbnailUrl = supabase.storage.from("thumbnails").getPublicUrl(path)
          .data.publicUrl;
      }

      const { error: insertError } = await supabase.from("games").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        roblox_url: robloxUrl.trim(),
        thumbnail_url: thumbnailUrl,
      });
      if (insertError) throw insertError;

      setSuccess(`"${title.trim()}" was submitted!`);
      setTitle("");
      setDescription("");
      setRobloxUrl("");
      setThumbnail(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          <CardTitle className="text-2xl">Submit your game</CardTitle>
          <CardDescription>
            Share your Roblox game so players can find it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  maxLength={100}
                  placeholder="My Awesome Obby"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  maxLength={2000}
                  placeholder="What makes your game fun?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roblox-url">Roblox link</Label>
                <Input
                  id="roblox-url"
                  type="url"
                  required
                  placeholder="https://www.roblox.com/games/123456"
                  value={robloxUrl}
                  onChange={(e) => setRobloxUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit game"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
