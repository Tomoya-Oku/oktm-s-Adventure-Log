// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import AdventureGrid from "./_component/AdventureGrid";

export const metadata = {
  title: "oktm's Adventure Log",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getTokyoYearMonth() {
  // 例: "2026-01"
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function makeMonthDays(month: string) {
  // month: "YYYY-MM"
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1..12
  const nDays = daysInMonth(y, m);

  const days: string[] = [];
  for (let d = 1; d <= nDays; d++) {
    days.push(`${yStr}-${mStr}-${pad2(d)}`); // "YYYY-MM-DD"
  }
  return days;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const month = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
    ? searchParams.month
    : getTokyoYearMonth();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">oktm&apos;s Adventure Log</h1>
        <p className="text-sm text-gray-600">ログインしてください。</p>
      </main>
    );
  }

  const days = makeMonthDays(month);

  // 月の範囲（start inclusive, end exclusive）
  const monthStart = `${month}-01T00:00:00+09:00`;
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const nextMonthY = m === 12 ? y + 1 : y;
  const nextMonthM = m === 12 ? 1 : m + 1;
  const monthEnd = `${nextMonthY}-${pad2(nextMonthM)}-01T00:00:00+09:00`;

  // 1) activities（列）
  const { data: types, error: typesError } = await supabase
    .from("activities")
    .select("id,name,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 2) グリッド用セッションだけ取得（note='grid' として扱う）
  //    ※ セッションをExcel的セルとして扱うための “運用ルール”：
  //       - start_at = YYYY-MM-DD 00:00 JST
  //       - end_at   = start_at + duration
  //       - note     = 'grid'
  const { data: gridSessions, error: sessionsError } = await supabase
    .from("activity_sessions")
    .select("id,activity_type_id,start_at,end_at,note")
    .eq("user_id", user.id)
    .eq("note", "grid")
    .gte("start_at", monthStart)
    .lt("start_at", monthEnd);

  // 初期値マップ： key = `${YYYY-MM-DD}|${typeId}` -> minutes(number)
  const initialMinutes: Record<string, number> = {};
  for (const s of gridSessions ?? []) {
    if (!s.end_at) continue;
    const day = String(s.start_at).slice(0, 10); // ここでは start_at を JST(+09)で保存している前提
    const start = new Date(s.start_at).getTime();
    const end = new Date(s.end_at).getTime();
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    initialMinutes[`${day}|${s.activity_type_id}`] = minutes;
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">oktm&apos;s Adventure Log</h1>
        <p className="text-sm text-gray-600">
          {user.email ?? user.id}
        </p>
      </header>

      {typesError && (
        <p className="text-sm text-red-600">activities error: {typesError.message}</p>
      )}
      {sessionsError && (
        <p className="text-sm text-red-600">activity_sessions error: {sessionsError.message}</p>
      )}

      <AdventureGrid
        month={month}
        days={days}
        types={(types ?? []).map((t) => ({ id: t.id, name: t.name }))}
        initialMinutes={initialMinutes}
      />
    </main>
  );
}
