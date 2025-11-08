import { currentUser } from '@clerk/nextjs/server'

export default async function CollectionsPage() {
	const user = await currentUser()
	if (!user) {
		return <div>请先登录</div>
	}

	return <div>CollectionsPage</div>
}
