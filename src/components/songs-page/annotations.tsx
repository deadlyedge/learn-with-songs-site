import { cn, fonts } from '@/lib/utils'
import type { NormalizedReferent } from '@/lib/referents'
import { Card, CardContent } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import Markdown from 'react-markdown'

type AnnotationsProps = {
	lyricLines: string[]
	referents: NormalizedReferent[]
}

const formatTabLabel = (referent: NormalizedReferent, index: number) => {
	const fragment = referent.fragment?.trim() ?? ''

	if (fragment.length > 0) {
		return fragment.length > 20 ? `${fragment.slice(0, 19)}...` : fragment
	}

	return `Annotation ${index + 1}`
}

const normalizeLyricsLine = (line: string) =>
	line.toLowerCase().replace(/\s+/g, ' ').trim()

const normalizeFragment = (fragment: string) =>
	fragment
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/[\[\]]/g, '')
		.trim()

const buildLyricContext = (fragment: string, lyricLines: string[]) => {
	const normalizedFragment = normalizeFragment(fragment)

	if (!normalizedFragment) {
		return null
	}

	let matchIndex = lyricLines.findIndex((line) =>
		normalizeLyricsLine(line).includes(normalizedFragment)
	)

	if (matchIndex === -1) {
		matchIndex = lyricLines.findIndex((line) =>
			normalizeLyricsLine(line).includes(
				normalizedFragment.replace(/[^a-z0-9\s']/g, '')
			)
		)
	}

	if (matchIndex === -1) {
		return null
	}

	const start = Math.max(0, matchIndex - 1)
	const end = Math.min(lyricLines.length, matchIndex + 2)
	return lyricLines.slice(start, end).join('\n')
}

export const Annotations = ({ lyricLines, referents }: AnnotationsProps) => {
	const hasReferents = referents.length > 0
	const firstTabValue = hasReferents ? `referent-${referents[0].id}` : undefined

	return (
		<Card
			id="float-annotations"
			className="m-2 fixed bottom-10 left-20 right-0 h-80 md:top-80 md:left-auto md:right-2 md:h-96 md:w-1/2 md:m-0 flex flex-col gap-2 bg-white/20 shadow-2xl rounded-2xl rounded-r-sm border border-white/20 py-2 px-0 backdrop-blur-sm">
			<CardContent className="h-full">
				{hasReferents ? (
					<Tabs defaultValue={firstTabValue} className="flex h-full flex-col">
						<TabsList className="w-full bg-transparent justify-start rounded-none border-b p-0 overflow-x-auto">
							{referents.map((referent, index) => {
								const value = `referent-${referent.id}`

								return (
									<TabsTrigger
										key={value}
										value={value}
										className="data-[state=active]:border-b-primary data-[state=active]:bg-transparent h-full rounded-none border-b-2 border-transparent data-[state=active]:shadow-none whitespace-nowrap px-3 py-2 text-sm">
										{formatTabLabel(referent, index)}
									</TabsTrigger>
								)
							})}
						</TabsList>
						{referents.map((referent) => {
							const value = `referent-${referent.id}`
							const lyricContext = buildLyricContext(
								referent.rangeContent ?? referent.fragment,
								lyricLines
							)
							console.log('lyricContext', lyricContext)

							return (
								<TabsContent key={value} value={value} className="mt-0 flex-1">
									<div>
										{referent.annotations.length > 0 ? (
											referent.annotations.map((annotation) => (
												<ScrollArea
													key={annotation.id}
													className={cn(
														'h-64 md:h-80 md:min-h-80 w-full p-2',
														fonts.sans
													)}>
													<header className="space-y-1 text-sm">
														<h3 className="text-base font-semibold">
															{referent.rangeContent ?? referent.fragment}
														</h3>
													</header>
													{annotation.body ? (
														<Markdown>{annotation.body}</Markdown>
													) : (
														<p className="text-sm text-muted-foreground">
															No explanation available for this annotation yet.
														</p>
													)}
												</ScrollArea>
											))
										) : (
											<p className="rounded-md border border-dashed border-border/70 bg-background/70 px-3 py-4 text-sm text-muted-foreground">
												No Genius annotations are available for this fragment
												yet.
											</p>
										)}
									</div>
								</TabsContent>
							)
						})}
					</Tabs>
				) : (
					<div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/60 px-4 py-8 text-sm text-muted-foreground text-center">
						<p>
							Genius annotations for this song are not available right now.
							Please try again later or open the song on Genius directly.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
