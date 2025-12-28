import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { fonts } from '@/lib/utils'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { EnsureClerkUser } from '@/components/ensure-clerk-user'
import { PWARegister } from '@/components/pwa-register'
import { Suspense } from 'react'
import { Loader } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/providers/query-provider'

// import Script from 'next/script'

export const metadata: Metadata = {
	metadataBase: new URL('https://le.zick.me'),
	title: 'Learn English with Songs',
	description:
		'通过阅读分析英语歌词，伴随兴趣和娱乐提升单词量和英语语感的学习平台。',
	authors: [
		{
			name: 'xdream',
			url: 'https://github.com/deadlyedge/learn-with-songs-site',
		},
		{ name: 'kaka' },
	],
	keywords: ['English', 'songs', 'learning', 'vocabulary'],
	icons: {
		icon: '/favicon.ico',
		apple: '/logo_512.png',
		other: [{ rel: 'apple-touch-icon', url: '/logo_512.png' }],
	},
	manifest: '/manifest.json',
	openGraph: {
		title: 'Learn English with Songs',
		description:
			'通过阅读分析英语歌词，伴随兴趣和娱乐提升单词量和英语语感的学习平台。',
		url: 'https://le.zick.me',
		siteName: 'Learn English with Songs',
		images: '/logo_512.png',
		locale: 'zh-CN',
		type: 'website',
	},
	// robots: {
	// 	index: true,
	// 	follow: true,
	// },
}

export const viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#4a3f35',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	// const CLOUDFLARE_SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY ?? ''
	return (
		<Suspense fallback={<Loader />}>
			<ClerkProvider>
				<QueryProvider>
					<html lang="en">
						{/* <Script
							src="https://challenges.cloudflare.com/turnstile/v0/api.js"
							async
							defer
							/> */}
						<body className={`${fonts.noto} antialiased`}>
							<PWARegister />
							<main className="mx-auto w-full xl:w-3/4">
								<EnsureClerkUser />

								<Navbar />
								{children}
							</main>
							<Footer />
							{/* <div className="cf-turnstile" data-sitekey={CLOUDFLARE_SITE_KEY} /> */}
							<Toaster />
						</body>
					</html>
				</QueryProvider>
			</ClerkProvider>
		</Suspense>
	)
}
