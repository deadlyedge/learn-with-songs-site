import { OpenRouter } from '@openrouter/sdk'

const apiKey = process.env.OPENROUTER_API_KEY || ''
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

export const learnWordInSentence = async (word: string, sentence: string) => {
	const content = `Student want to learn the word "${word}" in "${sentence}", 请给出该词语的读音、中文语义、整句的意思，以及两条该词语的英文例句，尽量简洁，不用说"好的"，不要回答其他内容，输出格式为markdown。`

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
