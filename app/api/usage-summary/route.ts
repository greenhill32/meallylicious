import { NextResponse } from "next/server";
import { readAllUsage } from "@/lib/usage";

export const maxDuration = 60;

type Bucket = { costUsd: number; calls: number };

function emptyBucket(): Bucket {
  return { costUsd: 0, calls: 0 };
}

function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function GET() {
  const entries = await readAllUsage();
  const now = new Date();
  const todayStart = startOfUTCDay(now);
  const weekStart = todayStart - 6 * 86_400_000;
  const monthStart = todayStart - 29 * 86_400_000;

  const today = emptyBucket();
  const week = emptyBucket();
  const month = emptyBucket();
  const allTime = emptyBucket();
  const byRoute: Record<string, Bucket> = {};

  for (const e of entries) {
    allTime.costUsd += e.costUsd;
    allTime.calls += 1;
    if (e.ts >= monthStart) {
      month.costUsd += e.costUsd;
      month.calls += 1;
    }
    if (e.ts >= weekStart) {
      week.costUsd += e.costUsd;
      week.calls += 1;
    }
    if (e.ts >= todayStart) {
      today.costUsd += e.costUsd;
      today.calls += 1;
    }
    const bucket = (byRoute[e.route] ??= emptyBucket());
    bucket.costUsd += e.costUsd;
    bucket.calls += 1;
  }

  return NextResponse.json({ today, week, month, allTime, byRoute });
}
