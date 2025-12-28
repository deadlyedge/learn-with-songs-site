'use client'

import { CheckCircleIcon, ShareIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'

export const ShareButton = () => {
	const [isShared, setIsShared] = useState(false)

	const handleShare = async () => {
		try {
			const url = window.location.href
			await navigator.clipboard.writeText(url)
			toast.success('链接已复制到剪贴板！')
			setIsShared(true)
			setTimeout(() => setIsShared(false), 2000)
		} catch {
			toast.error('复制失败，请手动复制链接')
		}
	}

	return (
		<Badge
			variant="buttonLike"
			className={cn(
				'hover:cursor-pointer border-0 transition-colors duration-200',
				isShared && 'bg-green-300! hover:cursor-default text-primary',
			)}
			onClick={handleShare}
		>
			{isShared ? <CheckCircleIcon /> : <ShareIcon />}
			分享
		</Badge>
	)
}
