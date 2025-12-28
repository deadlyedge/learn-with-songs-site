import Link from 'next/link'
import Image from 'next/image'
import { EditIcon, EyeIcon, Outdent } from 'lucide-react'
import { cn, fonts, hexToRgb01 } from '@/lib/utils'

import { Button } from '../ui/button'
import Iridescence from '../ui/effects/iridescence'

import { CollectButton } from './collect-button'
import { ShareButton } from './share-button'
import type { HeaderContents } from '@/types'
import { HeaderDescription } from './header-description'

type HeaderProps = {
	headerContents: HeaderContents
	songId: string
}

// Client component for the header content
function HeaderContent({ headerContents, songId }: HeaderProps) {
	return (
		<div className="relative flex flex-col gap-2 p-2 border-b shadow text-background text-shadow-lg">
			<div className="absolute inset-0 top-0 z-[-2]">
				<Iridescence
					color={hexToRgb01(headerContents.backgroundColor[0])}
					// secondColor={hexToRgb01(headerContents.backgroundColor[1])}
					mouseReact={false}
					amplitude={0.1}
					speed={0.1}
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
							<div className="flex items-center justify-end gap-2 text-xs">
								<ShareButton />
								<CollectButton songId={songId} />
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
				<HeaderDescription description={headerContents.description} />
			</div>
		</div>
	)
}

// Server Component wrapper
export const Header = ({ headerContents, songId }: HeaderProps) => {
	return <HeaderContent headerContents={headerContents} songId={songId} />
}
