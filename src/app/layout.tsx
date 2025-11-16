import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { fonts } from '@/lib/utils'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { EnsureClerkUser } from '@/components/ensure-clerk-user'
import { Suspense } from 'react'
import { Loader } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
	title: 'Learn English with Songs',
	description: '通过歌词搜索与学习，提升英语水平的音乐学习平台。',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<Suspense fallback={<Loader />}>
			<ClerkProvider>
				<html lang="en">
					<body className={`${fonts.noto} antialiased`}>
						<main className="mx-auto w-full xl:w-3/4">
							<EnsureClerkUser />

							<Navbar />
							{children}
						</main>
						<Footer />
						<Toaster />
					</body>
				</html>
			</ClerkProvider>
		</Suspense>
	)
}
