import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminTelegramId } from "@/lib/admin";
import { adminUpsertTenantConfig, listAdminTenantConfigs } from "@/lib/dbx";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export const runtime = "nodejs";

const TenantCreateSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  mode: z.enum(["legacy", "tenant"]).optional(),
  pooledConnectionString: z.string().trim().min(1).max(4000),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const items = await listAdminTenantConfigs();
  const payload = items.map((item) => ({
    event: item.event,
    tenant: item.tenant
      ? {
          eventSlug: item.tenant.eventSlug,
          active: item.tenant.active,
          createdAt: item.tenant.createdAt,
          updatedAt: item.tenant.updatedAt,
        }
      : null,
  }));

  return NextResponse.json({ items: payload });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = TenantCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const saved = await adminUpsertTenantConfig(parsed.data);
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
