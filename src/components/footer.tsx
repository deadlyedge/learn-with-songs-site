export const Footer = () => {
	return (
		<footer className="flex flex-col items-center justify-center text-xs border-t mt-2 p-2">
			<p>
				© 2025 made with love by&nbsp;
				<a href="mailto:xdream@gmail.com" className="underline">
					xdream
				</a>
				&nbsp;and{' '}
				<a href="mailto:luyukaka@outlook.com" className="underline">
					kaka.
				</a>
				&nbsp;
			</p>
			<p>
				<a href="https://github.com/deadlyedge/learn-with-songs-site">
					[Source Code],{' '}
				</a>
				<a href="https://le.zick.me/privacy">隐私权政策</a>
				{' 和 '}
				<a href="https://le.zick.me/terms-of-service">服务条款</a>
			</p>
		</footer>
	)
}
