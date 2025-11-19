'use client'

import { useState, useTransition } from 'react'
import { HeartIcon } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Toggle } from '../ui/toggle'
import { cn } from '@/lib/utils'

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
				const response = await fetch('/api/collections', {
					method: isCollected ? 'DELETE' : 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ songId }),
				})

				const payload = await response.json()

				if (!response.ok) {
					throw new Error(payload?.error ?? '收藏操作失败')
				}

				setIsCollected(Boolean(payload.isCollected))

				toast.success(
					payload.isCollected ? '已将这首歌加入收藏' : '已从收藏中移除'
				)
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
			// variant="outline"
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
