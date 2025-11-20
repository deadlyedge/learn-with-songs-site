'use client'

import { useState, useTransition } from 'react'
import { HeartIcon } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Toggle } from '../ui/toggle'
import { cn } from '@/lib/utils'
import {
	addSongToUserCollectionsAction,
	removeSongFromUserCollectionsAction,
} from '@/actions/collections'

type CollectButtonProps = {
	songId: string
	initialCollected?: boolean
}

const CollectToggleButton = ({
	songId,
	initialCollected,
}: CollectButtonProps) => {
	const [isCollected, setIsCollected] = useState(Boolean(initialCollected))
	const [isPending, startTransition] = useTransition()

	const handleToggle = () => {
		startTransition(async () => {
			try {
				if (isCollected) {
					await removeSongFromUserCollectionsAction(songId)
					setIsCollected(false)
					toast.success('已从收藏中移除')
				} else {
					await addSongToUserCollectionsAction(songId)
					setIsCollected(true)
					toast.success('已将这首歌加入收藏')
				}
			} catch (error) {
				toast.error((error as Error).message ?? '收藏操作失败，请稍后重试')
			}
		})
	}

	return (
		<Toggle
			aria-label="Toggle collected"
			onClick={handleToggle}
			disabled={isPending}
			defaultChecked={isCollected}
			size="sm"
			className={cn(
				'gap-1.5 text-xs bg-transparent rounded-lg',
				isCollected ? '*:[svg]:fill-destructive *:[svg]:stroke-destructive' : ''
			)}>
			<HeartIcon />
			{isPending ? '处理中...' : isCollected ? '已收藏' : '收藏'}
		</Toggle>
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
