export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const { lng: languageParam } = await params;
  const { getCurrentTenant } = await import('@entities/tenant/server');
  const { TenantProvider } = await import('@entities/tenant');
  const tenant = await getCurrentTenant();
  const language = languageParam || 'en';

  return (
    <html
      lang={language}
      style={
        {
          '--primary': tenant?.primaryColor || '#4F46E5',
          // ... other CSS vars
        } as React.CSSProperties
      }
    >
      <body>
        <TenantProvider
          tenant={
            tenant as unknown as {
              id: string;
              name: string;
              slug: string;
              primaryColor: string;
              accentColor: string;
              secondaryColor: string;
              logoUrl: string;
              faviconUrl: string;
              fontFamily: string;
            }
          }
        >
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
