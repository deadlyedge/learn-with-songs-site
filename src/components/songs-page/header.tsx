import Link from 'next/link'
import Image from 'next/image'
import { EditIcon, EyeIcon, HeartIcon, Outdent, ShareIcon } from 'lucide-react'
import { cn, fonts } from '@/lib/utils'

import Iridescence from '../ui/effects/iridescence'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

import Markdown from 'react-markdown'

type HeaderProps = {
	headerContents: {
		title: string
		artist: string
		album: string
		releaseDate: string
		description: string
		language: string
		contributors: string
		pageviews: string
		url: string
		artworkUrl: string
		backgroundColor: [number, number, number]
	}
}

export const Header = ({ headerContents }: HeaderProps) => {
	return (
		<div className="relative flex flex-col gap-2 p-2 border-b shadow text-background text-shadow-lg">
			<div className="absolute inset-0 top-0 z-[-2]">
				<Iridescence
					color={headerContents.backgroundColor}
					mouseReact={false}
					amplitude={0.1}
					speed={0.2}
				/>
			</div>

			<Link
				href="/"
				className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
				← 返回搜索
			</Link>
			<h1 className={cn('text-2xl font-semibold', fonts.uncial)}>
				{headerContents.title}
			</h1>
			<div className="flex flex-col md:flex-row gap-4">
				<div className="flex justify-between w-full md:w-1/2">
					<div className="flex flex-col justify-between flex-2">
						<div className="flex flex-col">
							<p className={cn('text-lg text-secondary', fonts.uncial)}>
								{headerContents.artist}
							</p>
							<div className="flex flex-wrap gap-2 gap-x-3 mt-1.5 text-sm">
								{headerContents.album ? (
									<span>专辑：{headerContents.album}</span>
								) : null}
								{headerContents.releaseDate ? (
									<time dateTime={headerContents.releaseDate}>
										发行：
										{headerContents.releaseDate}
									</time>
								) : null}
								{headerContents.language ? (
									<span>语言：{headerContents.language}</span>
								) : null}
								{headerContents.contributors ? (
									<span className="flex">
										<EditIcon />
										{headerContents.contributors}
									</span>
								) : null}
								{headerContents.pageviews ? (
									<span className="flex">
										<EyeIcon />
										{headerContents.pageviews}
									</span>
								) : null}
							</div>
						</div>
						<div className="flex flex-col items-end px-2 gap-1">
							<div className="flex text-xs justify-end gap-1">
								<Badge
									variant="buttonLike"
									className="hover:cursor-pointer border-0">
									<ShareIcon />
									分享
								</Badge>
								<Badge
									variant="buttonLike"
									className="hover:cursor-pointer border-0">
									<HeartIcon />
									收藏
								</Badge>
							</div>
							{headerContents.url ? (
								<Link
									href={headerContents.url}
									target="_blank"
									rel="noopener noreferrer"
									className="">
									<Button size="sm" className="rounded-full text-xs">
										在 Genius 上查看
										<Outdent />
									</Button>
								</Link>
							) : null}
						</div>
					</div>
					{headerContents.artworkUrl ? (
						<div className="h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">
							<Image
								src={headerContents.artworkUrl}
								alt={`${headerContents.title} 封面`}
								className="object-cover"
								sizes="192px"
								width={192}
								height={192}
								priority
							/>
						</div>
					) : null}
				</div>
				<div className="w-full md:w-1/2 h-52 overflow-y-auto border rounded-lg bg-amber-100/80 p-2 text-sm text-shadow-none">
					{headerContents.description ? (
						<div
							id="md"
							className={cn(
								'prose prose-a:text-gray-600 prose-a:hover:text-gray-500 max-w-none text-sm text-foreground',
								fonts.sans
							)}>
							<Markdown>{headerContents.description}</Markdown>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">歌曲详情加载中。</p>
					)}
				</div>
			</div>
		</div>
	)
}
