import Link from 'next/link'

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { Button } from './ui/button'
import { BookIcon, HeartIcon } from 'lucide-react'

export const Navbar = () => {
	return (
		<nav className="sticky top-0 left-0 w-full h-12 flex items-center justify-between gap-2 bg-primary/50 backdrop-blur-md p-2 z-40">
			<div className="font-bold">
				<Link href="/">
					LEwS{' '}
					<span className="text-xs text-muted-foreground font-light italic">
						powered by genius.com
					</span>
				</Link>
			</div>
			<div className="flex items-center">
				{/* <NavSearch /> */}
				<SignedIn>
					<Button variant="link" asChild>
						<Link href="/vocabulary">
							<BookIcon />
							生词本
						</Link>
					</Button>
					<Button variant="link" asChild>
						<Link href="/collections">
							<HeartIcon />
							我的收藏
						</Link>
					</Button>
					<UserButton appearance={{ elements: { avatarBox: 'ml-3' } }} />
				</SignedIn>
				<SignedOut>
					<SignInButton mode="modal">
						<Button variant="link">登入</Button>
					</SignInButton>
				</SignedOut>
			</div>
		</nav>
	)
}
