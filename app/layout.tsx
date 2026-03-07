import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: 'Become TangPing',
  description: 'Turn any photo into a TangPing crypto meme image.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth antialiased`}
    >
      <head>
        <link rel="icon" href="/logo.png" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col page-bg">
        <main className="flex-1">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}