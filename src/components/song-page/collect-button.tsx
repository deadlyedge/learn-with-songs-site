'use client'

import { useEffect, useState } from 'react'
import { HeartIcon } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUserDataStore } from '@/stores/user-data'
import { toast } from 'sonner'

type CollectButtonProps = {
	songId: string
	initialCollected?: boolean
}

const CollectToggleButton = ({
	songId,
	initialCollected = false,
}: CollectButtonProps) => {
	const {
		collections,
		addToCollections,
		removeFromCollections,
		fetchCollections,
		loading,
	} = useUserDataStore()
	const [isHydrated, setIsHydrated] = useState(false)

	// Use store state after hydration, initial prop before
	const isCollected = isHydrated
		? collections.some((song) => song.id === songId)
		: initialCollected

	// Fetch collections on mount to sync store with server state
	useEffect(() => {
		fetchCollections().finally(() => {
			setIsHydrated(true)
		})
	}, [fetchCollections])

	const handleToggle = async () => {
		if (isCollected) {
			await removeFromCollections(songId)
			toast.info('已取消收藏')
		} else {
			await addToCollections(songId)
			toast.success('已将歌曲加入收藏列表')
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
