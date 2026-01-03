// src/app/_actions/grid.ts
"use server";

import { createClient } from "@/lib/supabase/server";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeStartAtJST(day: string) {
  // "YYYY-MM-DDT00:00:00+09:00"
  return `${day}T00:00:00+09:00`;
}

function makeEndAtJST(day: string, minutes: number) {
  // 同日の中で完結する想定（0〜1439分くらい）
  const mins = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${day}T${pad2(hh)}:${pad2(mm)}:00+09:00`;
}

export async function updateGridCell(input: {
  day: string; // "YYYY-MM-DD"
  activityTypeId: string;
  minutes: number | null; // null -> delete
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false as const, error: "not authenticated" };

  const start_at = makeStartAtJST(input.day);

  // 既存セル行を探す（note='grid' + start_at固定）
  const { data: existing, error: findError } = await supabase
    .from("activity_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("activity_type_id", input.activityTypeId)
    .eq("note", "grid")
    .eq("start_at", start_at)
    .maybeSingle();

  if (findError) return { ok: false as const, error: findError.message };

  // 空欄なら削除
  if (input.minutes === null) {
    if (!existing?.id) return { ok: true as const };

    const { error: delError } = await supabase
      .from("activity_sessions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (delError) return { ok: false as const, error: delError.message };
    return { ok: true as const };
  }

  const end_at = makeEndAtJST(input.day, input.minutes);

  // update or insert
  if (existing?.id) {
    const { error: updError } = await supabase
      .from("activity_sessions")
      .update({ end_at })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (updError) return { ok: false as const, error: updError.message };
    return { ok: true as const };
  } else {
    const { error: insError } = await supabase.from("activity_sessions").insert({
      user_id: user.id,
      activity_type_id: input.activityTypeId,
      start_at,
      end_at,
      note: "grid",
    });

    if (insError) return { ok: false as const, error: insError.message };
    return { ok: true as const };
  }
}