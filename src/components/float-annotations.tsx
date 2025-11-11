import { cn, fonts } from '@/lib/utils'
import { Card, CardContent } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import Markdown from 'react-markdown'

const tabs = [
	{
		name: 'Home',
		value: 'home',
		content:
			'Welcome to the Home tab! Here, you can explore the latest updates, news, and highlights. Stay informed about what&apos;s happening and never miss out on important announcements.',
	},
	{
		name: 'Profile',
		value: 'profile',
		content:
			'This is your Profile tab. Manage your personal information, update your account details, and customize your settings to make your experience unique.',
	},
	{
		name: 'Messages',
		value: 'messages',
		content:
			'Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.Messages: Check your recent messages, start new conversations, and stay connected with your friends and contacts. Manage your chat history and keep the communication flowing.',
	},
]

export const FloatAnnotations = async () => {
	return (
		<Card
			id="float-annotations"
			className="m-2 fixed bottom-10 left-20 right-0 h-80 md:top-80 md:left-auto md:right-2 md:h-96 md:w-1/2 md:m-0 flex flex-col gap-2 bg-white/20 shadow-2xl rounded-2xl rounded-r-sm border border-white/20 py-2 px-0 backdrop-blur-sm">
			<CardContent>
				<Tabs defaultValue={tabs[0].value} className="w-full">
					<TabsList className="w-full bg-transparent justify-start rounded-none border-b p-0">
						{tabs.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="data-[state=active]:border-b-primary data-[state=active]:bg-transparent h-full rounded-none border-b-2 border-transparent data-[state=active]:shadow-none">
								{tab.name}
							</TabsTrigger>
						))}
					</TabsList>
					{tabs.map((tab) => (
						<TabsContent key={tab.value} value={tab.value}>
							<ScrollArea
								className={cn('h-64 md:h-80 md:min-h-80 w-full', fonts.sans)}>
								<p className="text-muted-foreground p-4 text-sm">
									<Markdown>{tab.content}</Markdown>
								</p>
							</ScrollArea>
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
			{/* {lyricRecord ? (
				<div className=" text-xs">
					<p className="text-sm text-muted-foreground">
						歌词提供者：{lyricRecord.provider}
					</p>
					<p className="text-sm text-muted-foreground">
						歌词拉取时间：{lyricRecord.fetchedAt.toLocaleString()}
					</p>
				</div>
			) : null}
			{description && (
				<div
					id="md"
					className={cn(
						'prose prose-a:text-gray-600 prose-a:hover:text-gray-500 max-w-none',
						fonts.sans
					)}>
					<Markdown>{description}</Markdown>
				</div>
			)} */}
		</Card>
	)
}
