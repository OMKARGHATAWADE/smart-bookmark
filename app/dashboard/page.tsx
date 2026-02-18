"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Bookmark = {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Auth: client-side only, redirect if no session
  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      setAuthChecked(true);
      if (error || !user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
    });
  }, [router]);

  // Fetch initial bookmarks client-side only (after we know we have a session via RLS)
  useEffect(() => {
    if (!userId) return;

    const supabase = getBrowserSupabase();

    (async () => {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError(error.message);
        setBookmarks([]);
      } else {
        setBookmarks(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
  }, [userId]);

  // Realtime: postgres_changes on public.bookmarks; state is single source of truth
  useEffect(() => {
    if (!userId) return;

    const supabase = getBrowserSupabase();

    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        (payload: RealtimePostgresChangesPayload<Bookmark>) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as Bookmark;
            if (newRow?.id) {
              setBookmarks((prev) =>
                prev.some((b) => b.id === newRow.id)
                  ? prev
                  : [newRow, ...prev]
              );
            }
          }
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Bookmark;
            if (oldRow?.id) {
              setBookmarks((prev) => prev.filter((b) => b.id !== oldRow.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !userId) return;
    setSaving(true);
    const supabase = getBrowserSupabase();
    const { data: newBookmark, error } = await supabase
      .from("bookmarks")
      .insert({ url: url.trim(), user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Error adding bookmark", error);
    } else if (newBookmark) {
      setUrl("");
      setBookmarks((prev) => [newBookmark as Bookmark, ...prev]);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) console.error("Error deleting bookmark", error);
  };

  const handleSignOut = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!authChecked || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-900">
            Smart Bookmark App
          </h1>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <form
          onSubmit={handleAddBookmark}
          className="flex gap-2 rounded-lg bg-white p-4 shadow-sm"
        >
          <input
            type="url"
            required
            placeholder="https://example.com/article"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </form>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Your bookmarks
          </h2>
          {fetchError ? (
            <p className="text-sm text-amber-600" role="alert">
              Could not load bookmarks: {fetchError}
            </p>
          ) : loading ? (
            <p className="text-sm text-slate-500">Loading bookmarks…</p>
          ) : bookmarks.length === 0 ? (
            <p className="text-sm text-slate-500">
              No bookmarks yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-slate-800 hover:underline"
                  >
                    {bookmark.title ?? bookmark.url}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(bookmark.id)}
                    className="ml-3 text-xs text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
