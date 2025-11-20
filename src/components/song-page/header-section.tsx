import { Header } from './header'
// import { initialUser } from '@/lib/clerk-auth'
import { isSongCollected } from '@/actions/collections'
import { getSongDetails } from '@/lib/api/song-data'

export async function HeaderSection({ path }: { path: string }) {
	const data = await getSongDetails(path)
	// const user = await initialUser()
	const isCollected = data.songId ? await isSongCollected(data.songId) : false

	return (
		<Header
			headerContents={data.headerContents}
			songId={data.songId}
			isCollected={isCollected}
		/>
	)
}
