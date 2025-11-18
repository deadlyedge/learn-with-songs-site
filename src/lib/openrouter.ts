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
	const content = `用户想学习词语"${word}"在句子"${line}"中的用法。请严格按照以下格式输出，不包含任何额外内容，不要包含括号：

**读音:** [音标，如 /ˈɪŋɡlɪʃ/]\n
**语义:** [*adj.* 准确的汉语含义]\n
**整句:** [整句"${line}"的中文翻译]\n
**例句:** \n
*1.* [使用该词的英文例句]\n
*2.* [另一个使用该词的英文例句]\n

确保输出是纯Markdown文本，无其他说明。`

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
