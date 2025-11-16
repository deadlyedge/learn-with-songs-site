'use server'

import { OpenRouter } from '@openrouter/sdk'

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
	throw new Error('OPENROUTER_API_KEY is not set')
}
const model = 'google/gemini-2.0-flash-001'

const openRouter = new OpenRouter({
	apiKey,
})

export const translator = async (
	text: string,
	language: string = 'chinese'
) => {
	const content = `Translate the following text to ${language}:\n\n${text}`

	const response = await openRouter.chat.send({
		model,
		messages: [
			{
				role: 'user',
				content,
			},
		],
	})

	return response.choices[0].message.content
}

export const summarizer = async (text: string) => {
	const content = `Summarize the following text:\n\n${text}`

	const response = await openRouter.chat.send({
		model,
		messages: [
			{
				role: 'user',
				content,
			},
		],
	})

	return response.choices[0].message.content
}

export const learnWordInLine = async (word: string, line: string) => {
	const content = `Student want to learn the word "${word}" in "${line}", 请给出该词语的读音、中文语义、整句的意思，以及两条该词语的英文例句，尽量简洁，不用说"好的"，不要回答其他内容，输出格式为markdown。`

	const response = await openRouter.chat.send({
		model,
		messages: [
			{
				role: 'user',
				content,
			},
		],
	})

	return response.choices[0].message.content as string
}
