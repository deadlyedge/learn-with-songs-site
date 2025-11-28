import Link from 'next/link'

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { SquircleDashedIcon, ArrowUpRightIcon } from 'lucide-react'

export default async function NotFound() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<SquircleDashedIcon />
				</EmptyMedia>
				<EmptyTitle>页面不存在</EmptyTitle>
				<EmptyDescription>你访问的页面不存在于本站</EmptyDescription>
				<Link href="/">
					<span className="flex">
						去搜索歌曲
						<ArrowUpRightIcon />
					</span>
				</Link>
			</EmptyHeader>
		</Empty>
	)
}
