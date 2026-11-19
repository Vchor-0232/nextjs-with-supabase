"use client";

/* eslint-disable @next/next/no-img-element -- avatars come from storage or /avatars */

import { useRef, useState } from "react";
import { Camera, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Pick a ready-made Gamesprout avatar or upload your own picture.
// Uploads are cropped to a square, shrunk to 512px and saved as WebP in the
// "avatars" storage bucket under your own folder (see
// supabase/migrations/20261119000000_avatar_uploads.sql).

// 1–12: sprout buddies; 13: controller; 14: cat; 15: developer.
export const PRESET_AVATARS = Array.from(
  { length: 15 },
  (_, i) => `/avatars/sprout-${String(i + 1).padStart(2, "0")}.svg`,
);

const AVATAR_NAMES: Record<number, string> = {
  12: "Controller avatar",
  13: "Cat avatar",
  14: "Developer avatar",
};

const MAX_BYTES = 10 * 1024 * 1024; // before shrinking
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Center-crop to a square and resize, in the browser, so uploads stay small.
async function squareWebp(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("couldn't encode");
  return blob;
}

export function AvatarPicker({
  userId,
  username,
  value,
  onChange,
}: {
  userId: string;
  username: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use a PNG, JPG, WebP or GIF picture.");
    if (file.size > MAX_BYTES) return setError("That picture is too big (max 10 MB).");

    setUploading(true);
    try {
      const blob = await squareWebp(file);
      const supabase = createClient();
      const path = `${userId}/${Date.now()}.webp`;
      const { error: upError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (upError) throw upError;

      // Tidy up older uploads (only yours; the storage rules allow nothing else).
      const { data: old } = await supabase.storage.from("avatars").list(userId);
      const stale = (old ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
      if (stale.length) await supabase.storage.from("avatars").remove(stale);

      onChange(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        /bucket not found/i.test(msg)
          ? "Picture uploads aren't switched on yet. Pick one of the avatars below for now."
          : "Couldn't upload that picture. Try another one.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const uploaded = value !== null && !PRESET_AVATARS.includes(value);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 block text-sm font-bold">Profile picture</legend>

      <div className="flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt="Your profile picture"
            className="h-[76px] w-[76px] shrink-0 rounded-full border-2 border-[#ffcc00] object-cover shadow-[0_0_8px_rgba(255,204,0,0.5)]"
          />
        ) : (
          <span
            aria-label="No profile picture yet"
            className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-2 border-[#ffcc00] bg-[#4d62db] text-3xl font-black uppercase shadow-[0_0_8px_rgba(255,204,0,0.5)]"
          >
            {username.slice(0, 1) || "?"}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-9 items-center gap-1.5 rounded-[20px] bg-[#4d62db] px-4 text-sm font-extrabold transition hover:bg-[#5d71e5] disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {uploading ? "Uploading..." : uploaded ? "Upload a different picture" : "Upload a picture"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 self-start text-xs font-bold text-white/60 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove picture
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      <p className="text-xs text-neutral-400">
        Tip: pick a picture that doesn&apos;t show your face or where you live.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      <p className="text-xs font-bold text-white/70">Or pick a Gamesprout avatar:</p>
      <div role="radiogroup" aria-label="Gamesprout avatars" className="grid grid-cols-5 gap-2">
        {PRESET_AVATARS.map((src, i) => {
          const on = value === src;
          return (
            <button
              key={src}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={AVATAR_NAMES[i] ?? `Avatar ${i + 1}`}
              onClick={() => onChange(src)}
              className={cn(
                "relative aspect-square rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                on ? "ring-[3px] ring-[#ffcc00] shadow-[0_0_10px_rgba(255,204,0,0.7)]" : "ring-1 ring-white/15",
              )}
            >
              <img src={src} alt="" className="h-full w-full rounded-full" />
              {on && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-black bg-[#ffcc00]">
                  <Check className="h-3 w-3 text-black" strokeWidth={3.5} aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
