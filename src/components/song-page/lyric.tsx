import { getSongLyrics } from '@/actions/lyrics'

// type LyricProps = {
// 	error: string | null
// 	lyricLines: string[]
// 	// songId: string
// 	// songPath: string
// }

export const Lyric = async ({ path }: { path: string }) => {
	const { lyricsError, lyricLines } = await getSongLyrics(path)

	return (
		<section className="space-y-2 w-full md:w-1/2">
			<h2 className="text-xl font-semibold px-2">歌词 Lyrics</h2>
			<div id="lyrics" className="p-4 md:p-6">
				{lyricsError ? (
					<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{lyricsError}
					</p>
				) : (
					<div className="w-full mb-40">
						{lyricLines.length > 0 ? (
							<ul className="space-y-2">
								{lyricLines.map((line, index) =>
									line === '' ? (
										// <li key={`spacer-${index}`} className="h-3" />
										<span
											key={`spacer-${index}`}
											className="w-8 text-xs -ml-2 mr-1 text-gray-500 font-thin italic select-none">
											{index + 1}
										</span>
									) : (
										<li key={`${index}-${line}`} className="leading-4">
											<span className="w-8 text-xs -ml-2 mr-1 text-gray-500 font-thin italic select-none">
												{index + 1}
											</span>
											<span
												data-line-text={line}
												data-line-index={index + 1}
												className="bg-none hover:bg-amber-200 ring-0 ring-amber-300 hover:ring-2">
												{line}
											</span>
										</li>
									)
								)}
							</ul>
						) : (
							<p className="text-sm text-muted-foreground">
								歌词加载中或暂不可用。
							</p>
						)}
					</div>
				)}
			</div>
		</section>
	)
}
