'use client'

import { HeartIcon } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUserDataStore } from '@/stores/user-data'

type CollectButtonProps = {
	songId: string
	initialCollected?: boolean
}

const CollectToggleButton = ({
	songId,
}: // initialCollected,
CollectButtonProps) => {
	const { collections, addToCollections, removeFromCollections, loading } =
		useUserDataStore()
	const isCollected = collections.some((song) => song.id === songId)

	const handleToggle = async () => {
		if (isCollected) {
			await removeFromCollections(songId)
		} else {
			await addToCollections(songId)
		}
	}

	return (
		<Button
			aria-label="Toggle collected"
			onClick={handleToggle}
			disabled={loading}
			variant="ghost"
			size="sm"
			className={cn(
				'gap-1.5 text-xs bg-transparent rounded-lg',
				isCollected ? 'text-destructive hover:text-destructive' : ''
			)}>
			<HeartIcon className={cn(isCollected ? 'fill-destructive' : '')} />
			{loading ? '处理中...' : isCollected ? '已收藏' : '收藏'}
		</Button>
	)
}

export const CollectButton = (props: CollectButtonProps) => {
	return (
		<div className="inline-flex">
			<SignedIn>
				<CollectToggleButton {...props} />
			</SignedIn>
			<SignedOut>
				<SignInButton mode="modal">
					<Button variant="ghost" size="sm" className="gap-1.5 text-xs">
						<HeartIcon />
						收藏
					</Button>
				</SignInButton>
			</SignedOut>
		</div>
	)
}
