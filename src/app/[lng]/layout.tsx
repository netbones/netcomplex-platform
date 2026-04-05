export default async function RootLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: { lng: string };
}) {
  const tenant = await getCurrentTenant();
  const language = lng || tenant?.defaultLanguage || 'en';

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
        <TenantProvider tenant={tenant!}>{children}</TenantProvider>
      </body>
    </html>
  );
}
