import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminTelegramId } from "@/lib/admin";
import { adminDeleteTenantConfig, adminPatchTenantConfig } from "@/lib/dbx";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export const runtime = "nodejs";

const TenantPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).nullable().optional(),
  status: z.string().trim().min(1).max(40).nullable().optional(),
  mode: z.enum(["legacy", "tenant"]).optional(),
  pooledConnectionString: z.string().trim().min(1).max(4000).nullable().optional(),
  active: z.boolean().optional(),
});

function normalizeSlug(raw: string) {
  return raw.trim();
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const eventSlug = normalizeSlug(slug);
  if (!eventSlug) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = TenantPatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const saved = await adminPatchTenantConfig(eventSlug, {
    ...parsed.data,
    name: parsed.data.name ?? undefined,
    status: parsed.data.status ?? undefined,
    pooledConnectionString: parsed.data.pooledConnectionString ?? undefined,
  });

  if (!saved) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: {
      event: saved.event,
      tenant: saved.tenant
        ? {
            eventSlug: saved.tenant.eventSlug,
            active: saved.tenant.active,
            createdAt: saved.tenant.createdAt,
            updatedAt: saved.tenant.updatedAt,
          }
        : null,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const eventSlug = normalizeSlug(slug);
  if (!eventSlug) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await adminDeleteTenantConfig(eventSlug);
  return NextResponse.json({ ok: true });
}
