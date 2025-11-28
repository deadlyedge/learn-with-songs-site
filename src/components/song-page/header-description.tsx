import { cn, fonts } from '@/lib/utils'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Markdown from 'react-markdown'
import { Button } from '../ui/button'

type HeaderDescriptionProps = { description: string }

export const HeaderDescription = ({ description }: HeaderDescriptionProps) => {
	return (
		<div className="w-full md:w-1/2 h-52 overflow-y-auto border rounded-lg bg-white/80 p-2 text-sm text-shadow-none relative">
			<SignedOut>
				<div className="absolute -right-2 -top-1 border border-dashed rounded-lg px-2 text-muted-foreground bg-white/50">
					<SignInButton mode="modal">
						<Button
							size="sm"
							variant="link"
							className="text-foreground text-xs">
							登入可显示中文简介
						</Button>
					</SignInButton>
				</div>
				{description ? (
					<div
						className={cn(
							'markdown max-w-none text-sm text-foreground',
							fonts.sans
						)}>
						<Markdown>{description}</Markdown>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">歌曲详情加载中。</p>
				)}
			</SignedOut>
			<SignedIn>
				<div className="absolute -right-2 -top-1 border border-dashed rounded-lg px-2 text-muted-foreground text-xs bg-white/50">
					中文简介developing...
				</div>
				{description ? (
					<div
						className={cn(
							'markdown max-w-none text-sm text-foreground',
							fonts.sans
						)}>
						<Markdown>{description}</Markdown>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">歌曲详情加载中。</p>
				)}
			</SignedIn>
		</div>
	)
}
