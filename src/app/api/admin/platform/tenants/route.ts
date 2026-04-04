import { NextRequest, NextResponse } from 'next/server';
import { listTenants, createTenant, updateTenant, deleteTenant } from '@/lib/tenant';

export async function GET() {
  try {
    const tenants = await listTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Failed to list tenants:', error);
    return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const tenant = await createTenant({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      customDomain: body.customDomain || null,
      logoUrl: body.logoUrl || null,
      faviconUrl: body.faviconUrl || null,
      primaryColor: body.primaryColor || '#4F46E5',
      accentColor: body.accentColor || null,
      secondaryColor: body.secondaryColor || null,
      fontFamily: body.fontFamily || null,
      customCss: body.customCss || null,
      active: body.active ?? true,
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Failed to create tenant:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
