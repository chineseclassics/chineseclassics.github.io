import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  ),
  title: '太虛幻境 — 古風小鎮營造',
  description: '一個精緻的等距視角古風小鎮營造遊戲。建設你的太虛幻境，管理翰墨境、錦繡境、豆田境等區域。',
  openGraph: {
    title: '太虛幻境 — 古風小鎮營造',
    description: '一個精緻的等距視角古風小鎮營造遊戲。建設你的太虛幻境，管理翰墨境、錦繡境、豆田境等區域。',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1179,
        height: 1406,
        type: 'image/png',
        alt: '太虛幻境 - 古風小鎮營造遊戲截圖',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '太虛幻境 — 古風小鎮營造',
    description: '一個精緻的等距視角古風小鎮營造遊戲。建設你的太虛幻境，管理翰墨境、錦繡境、豆田境等區域。',
    images: [
      {
        url: '/opengraph-image',
        width: 1179,
        height: 1406,
        alt: '太虛幻境 - 古風小鎮營造遊戲截圖',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '太虛幻境',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f1219',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`dark ${playfair.variable} ${dmSans.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/assets/garden/house_small.png" />
      </head>
      <body className="bg-background text-foreground antialiased font-sans overflow-hidden">{children}<Analytics /></body>
    </html>
  );
}
