import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from './ui/item'

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
		href: 'https://le.zick.me/privacy',
	},
	{
		title: '服务条款',
		description: '我们的服务按"现状"提供。',
		href: 'https://le.zick.me/terms-of-service',
	},
]

export const Footer = () => {
	return (
		<footer className="flex flex-col items-center justify-center text-xs border-t mt-2 p-2 gap-4">
			{/* <p>
				<a href="https://github.com/deadlyedge/learn-with-songs-site">
					[Source Code],{' '}
				</a>
				<a href="https://le.zick.me/privacy">隐私权政策</a>
				{' 和 '}
				<a href="https://le.zick.me/terms-of-service">服务条款</a>
			</p> */}
			<ItemGroup className="flex-wrap flex-row items-start justify-center gap-6">
				{itemContents.map((item, index) => (
					<Item key={index} variant="muted" className="w-64">
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
