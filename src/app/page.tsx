import { SongSearch } from '@/components/song-search'

export default function HomePage() {
	return (
		<div className="space-y-12 pb-10 pt-6">
			<section className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 shadow-sm">
				<h1 className="text-3xl font-semibold sm:text-4xl">
					看歌词，学英语 —— Learning English with Songs
				</h1>
				<p className="mt-3 max-w-2xl text-base text-muted-foreground">
					输入歌曲或歌手名称，快速找到歌词，配合注释与学习记录开启你的音乐英语之旅。
				</p>
			</section>

			<SongSearch />
		</div>
	)
}
