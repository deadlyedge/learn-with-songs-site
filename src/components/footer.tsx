import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from './ui/item'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://le.zick.me'

const itemContents = [
	{
		title: '贡献者1',
		description: '贡献者预留空间',
		href: 'mailto:XXXXXXXXXXXXXXXX',
	},
	{
		title: 'About the Logo',
		description: 'Site Logo is Sketched by Kaka, and made by xdream.',
		href: 'mailto:xdream@gmail.com',
	},
	{
		title: 'Source Code',
		description:
			'如果你对本服务的源代码感兴趣，或者你希望提交你的建议，欢迎访问我们在github上的项目。',
		href: 'https://github.com/deadlyedge/learn-with-songs-site',
	},
	{
		title: '隐私权政策',
		description:
			'您的登录目前只用来为您提供生词本和收藏服务。详情请点击标题查看。',
		href: `${baseUrl}/privacy`,
	},
	{
		title: '服务条款',
		description: '我们的服务按"现状"提供。',
		href: `${baseUrl}/terms-of-service`,
	},
]

export const Footer = () => {
	return (
		<footer className="flex flex-col items-center justify-center text-xs border-t mt-2 p-2 gap-4 pt-6">
			<ItemGroup className="flex-wrap flex-row items-start justify-center gap-6">
				{itemContents.map((item) => (
					<Item
						key={item.title}
						variant="muted"
						className="w-48 sm:w-64 rounded-lg"
					>
						<ItemContent>
							<ItemTitle>
								<a href={item.href} target="_blank" className="underline">
									{item.title}
								</a>
							</ItemTitle>
							<ItemDescription className="line-clamp-none text-wrap">
								{item.description}
							</ItemDescription>
						</ItemContent>
					</Item>
				))}
			</ItemGroup>
			<p>
				© 2025 made with ❤️ by&nbsp;
				<a href="mailto:xdream@gmail.com" className="underline">
					xdream
				</a>
				&nbsp;and{' '}
				<a href="mailto:luyukaka@outlook.com" className="underline">
					kaka.
				</a>
				&nbsp;
			</p>
		</footer>
	)
}
