import Image from 'next/image'
import { FeaturedSongs } from '@/components/featured-songs'
import { InputWithSuggestions } from '@/components/search/input-with-suggestions'
import { SearchResults } from '@/components/search/search-results'

export default async function HomePage() {
	return (
		<div className="space-y-12 pb-10 pt-6">
			<div className="flex flex-col items-center justify-center">
				<section className="w-full sm:w-lg rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-8 shadow-sm">
					<div className="flex items-center justify-center gap-4">
						<Image
							src="/logo_512.png"
							alt="app logo"
							width={128}
							height={128}
						/>
						<div>
							<h1 className="text-2xl font-semibold sm:text-3xl">
								看歌词，学英语
							</h1>
							<h2>—— Learning English with Songs</h2>
						</div>
					</div>
					<p className="mt-3 max-w-2xl text-base text-muted-foreground">
						输入歌曲或歌手名称，快速找到歌词，配合注释与学习记录开启你的音乐英语之旅。
					</p>
				</section>
			</div>

			{/* SongSearch */}
			<section className="space-y-6 px-1.5">
				<InputWithSuggestions />
				<SearchResults />
			</section>

			{/* <Suspense fallback={<Loader />}> */}
			<FeaturedSongs />
			{/* </Suspense> */}
		</div>
	)
}
