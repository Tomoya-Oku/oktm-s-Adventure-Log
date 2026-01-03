// src/app/AdventureGrid.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGridCell } from "../../_actions/grid";

type ActivityType = { id: string; name: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToHMM(mins: number) {
  if (!Number.isFinite(mins) || mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${pad2(m)}`;
}

function parseToMinutes(input: string): number | null {
  const s = input.trim();
  if (s === "") return null;

  // 許可例:
  // "90" -> 90
  // "1:30" -> 90
  // "2:00" -> 120
  if (/^\d+$/.test(s)) return Math.max(0, Number(s));

  const m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) {
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (mm >= 60) return null;
    return Math.max(0, h * 60 + mm);
  }

  return null;
}

export default function AdventureGrid(props: {
  month: string; // "YYYY-MM"
  days: string[]; // ["YYYY-MM-DD"...]
  types: ActivityType[];
  initialMinutes: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // key = `${day}|${typeId}` -> string (表示/編集用)
  const [cells, setCells] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(props.initialMinutes)) {
      next[k] = minutesToHMM(v);
    }
    return next;
  });

  const monthValue = props.month;

  const allKeys = useMemo(() => {
    const keys: string[] = [];
    for (const day of props.days) {
      for (const t of props.types) keys.push(`${day}|${t.id}`);
    }
    return keys;
  }, [props.days, props.types]);

  // 未設定のセルは空文字で統一（表描画の安定化）
  const getCell = (key: string) => cells[key] ?? "";

  const onMonthChange = (v: string) => {
    // v: "YYYY-MM"
    startTransition(() => {
      router.push(`/?month=${encodeURIComponent(v)}`);
      router.refresh();
    });
  };

  const commit = async (day: string, typeId: string, raw: string) => {
    const key = `${day}|${typeId}`;
    const mins = parseToMinutes(raw);

    // 入力が無効なら元に戻す
    if (raw.trim() !== "" && mins === null) {
      setCells((prev) => ({ ...prev, [key]: prev[key] ?? "" }));
      return;
    }

    // 楽観更新（UIは先に反映）
    const display = mins === null ? "" : minutesToHMM(mins);
    setCells((prev) => ({ ...prev, [key]: display }));

    startTransition(async () => {
      const res = await updateGridCell({
        day, // "YYYY-MM-DD"
        activityTypeId: typeId,
        minutes: mins, // null なら削除
      });

      if (!res.ok) {
        // 失敗したら戻す（最低限）
        setCells((prev) => ({ ...prev, [key]: prev[key] ?? "" }));
        alert(res.error ?? "DB update failed");
      } else {
        // サーバ側の最新を取り直したい場合は refresh
        router.refresh();
      }
    });
  };

  return (
    <section className="space-y-3">
      {/* 月選択UI */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Month</label>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => onMonthChange(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        {isPending && <span className="text-xs text-gray-500">saving...</span>}
      </div>

      {/* Excel風テーブル */}
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left sticky left-0 bg-gray-50 z-10 border-r text-black">
                Date
              </th>
              {props.types.map((t) => (
                <th key={t.id} className="p-2 text-left whitespace-nowrap">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {props.days.map((day) => (
              <tr key={day} className="border-t">
                {/* 一番左：日付 */}
                <td className="p-2 font-medium sticky left-0 bg-white z-10 border-r whitespace-nowrap text-black">
                  {day}
                </td>

                {/* activities列 */}
                {props.types.map((t) => {
                  const key = `${day}|${t.id}`;
                  const value = getCell(key);

                  return (
                    <td key={key} className="p-1">
                      <input
                        className="w-24 rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={value}
                        placeholder=""
                        onChange={(e) => {
                          const v = e.target.value;
                          setCells((prev) => ({ ...prev, [key]: v }));
                        }}
                        onBlur={(e) => commit(day, t.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        aria-label={`${day} ${t.name}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        入力形式： <b>分</b>（例: 90）または <b>h:mm</b>（例: 1:30）。空欄は削除扱い。
      </p>
    </section>
  );
}
