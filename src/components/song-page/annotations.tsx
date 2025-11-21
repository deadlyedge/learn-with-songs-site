import { fonts } from '@/lib/utils'
// import type { NormalizedReferent } from '@/lib/referents'
import Markdown from 'react-markdown'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '../ui/accordion'

import { getSongReferents } from '@/lib/api/song-data'

// type AnnotationsProps = {
// 	referents: NormalizedReferent[]
// }

const normalizeAnnotationBody = (body: string | null) => {
	if (!body) return null

	const lines = body.split(/\r?\n/)
	const normalizedLines: string[] = []
	let consecutiveBlank = 0

	for (const line of lines) {
		const isBlank = line.trim() === ''

		if (isBlank) {
			consecutiveBlank += 1

			if (consecutiveBlank === 1) {
				normalizedLines.push('')
			}

			continue
		}

		consecutiveBlank = 0
		normalizedLines.push(line)
	}

	while (normalizedLines.length > 0 && normalizedLines[0].trim() === '') {
		normalizedLines.shift()
	}

	while (
		normalizedLines.length > 0 &&
		normalizedLines[normalizedLines.length - 1].trim() === ''
	) {
		normalizedLines.pop()
	}

	if (normalizedLines.length === 0) {
		return null
	}

	return normalizedLines.join('\n')
}

export const Annotations = async ({ songId }: { songId?: string }) => {
	if (!songId) {
		return null
	}

	const { referents } = await getSongReferents(songId)
	const hasReferents = referents.length > 0
	const firstTabValue = hasReferents ? `referent-${referents[0].id}` : undefined

	return (
		<div className="w-full md:w-1/2 border-l pl-2">
			{hasReferents ? (
				<section>
					<h2 className="block md:hidden text-xl font-semibold px-2">
						注解 Annotations
					</h2>

					<Accordion
						type="single"
						collapsible
						defaultValue={firstTabValue}
						className={fonts.sans}>
						{referents.map((referent) => {
							const normalizedAnnotations = referent.annotations
								.map((annotation) => {
									const normalizedBody = normalizeAnnotationBody(
										annotation.body
									)

									if (!normalizedBody) {
										return null
									}

									return {
										id: annotation.id,
										body: normalizedBody,
									}
								})
								.filter(
									(
										value
									): value is {
										id: number
										body: string
									} => Boolean(value)
								)

							const value = `referent-${referent.id}`

							return (
								<AccordionItem key={value} value={value}>
									<AccordionTrigger>
										<span className="font-bold">
											{referent.rangeContent ?? referent.fragment}
										</span>
									</AccordionTrigger>
									<AccordionContent className="max-w-fit flex flex-col markdown leading-snug text-sm">
										{normalizedAnnotations.length > 0 ? (
											normalizedAnnotations.map((annotation) => (
												<Markdown
													key={annotation.id}
													components={{
														p: ({ children }) => (
															<p className="mb-1 last:mb-0 leading-snug">
																{children}
															</p>
														),
													}}>
													{annotation.body}
												</Markdown>
											))
										) : (
											<p className="rounded-md border border-dashed border-border/70 bg-background/70 px-3 py-4 text-sm text-muted-foreground">
												No Genius annotations are available for this fragment
												yet.
											</p>
										)}
									</AccordionContent>
								</AccordionItem>
							)
						})}
					</Accordion>
				</section>
			) : (
				<div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/60 px-4 py-8 text-sm text-muted-foreground text-center">
					<p>
						Genius annotations for this song are not available right now. Please
						try again later or open the song on Genius directly.
					</p>
				</div>
			)}
		</div>
	)
}
