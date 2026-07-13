import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VISIT_COUNT_KEY = "json-flowchart:visit-count";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { count: null, error: "Redis is not configured for this deployment." },
      { status: 200 },
    );
  }

  const count = await redis.incr(VISIT_COUNT_KEY);
  return NextResponse.json({ count });
}
