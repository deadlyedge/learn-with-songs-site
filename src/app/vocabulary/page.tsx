import { getUserVocabulary } from '@/actions/vocabulary'
import { VocabularyList } from '@/components/vocabulary-list'

export default async function VocabularyPage() {
	const vocabulary = await getUserVocabulary()

	if (!vocabulary) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				用户信息尚未同步，请刷新页面
			</div>
		)
	}

	const newWords = vocabulary.filter((entry) => !entry.mastered)
	const historyWords = vocabulary.filter((entry) => entry.mastered)

	return (
		<main className="container mx-auto">
			<header className="space-y-2 p-4">
				<h1 className="text-2xl font-semibold">我的生词本</h1>
				<p className="text-sm text-muted-foreground">
					这里展示你收藏的单词/短语，点击复习即可重新打开选中位置
				</p>
			</header>
			<VocabularyList
				initialNewWords={newWords}
				initialHistoryWords={historyWords}
			/>
		</main>
	)
}
