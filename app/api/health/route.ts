import { NextResponse } from "next/server";

// Liveness probe for the docker healthcheck. Must stay DB-free so it
// answers even when the database is unreachable.
export async function GET() {
  return NextResponse.json({ ok: true });
}
