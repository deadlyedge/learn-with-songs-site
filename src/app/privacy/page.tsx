import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: '隐私政策 | Learn English with Songs',
	description: 'Learn English with Songs 的隐私政策页面',
}

export default function PrivacyPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-6">隐私政策</h1>
			<div className="prose prose-lg max-w-none">
				<p className="text-sm text-gray-600 mb-8">
					最后更新日期：2025年11月21日
				</p>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">1. 信息收集</h2>
					<p>我们通过以下方式收集您的信息：</p>
					<ul className="list-disc pl-6 mt-2">
						<li>
							当您注册账户或使用我们的服务时，我们会收集您提供的个人信息。
						</li>
						<li>
							我们使用Google OAuth进行身份验证，这可能涉及Google收集您的信息。
						</li>
						<li>我们可能会收集使用数据以改进我们的服务。</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">2. 信息使用</h2>
					<p>我们使用收集的信息来：</p>
					<ul className="list-disc pl-6 mt-2">
						<li>提供、维护和改进我们的服务。</li>
						<li>处理您的账户和交易。</li>
						<li>与您沟通关于我们的服务。</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">3. 信息共享</h2>
					<p>我们不会出售、出租或以其他方式披露您的个人信息，除非：</p>
					<ul className="list-disc pl-6 mt-2">
						<li>获得您的明确同意。</li>
						<li>法律要求或为了保护我们的权利。</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">4. 数据安全</h2>
					<p>
						我们实施适当的安全措施来保护您的个人信息免受未经授权的访问、更改、披露或销毁。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">5. 您的权利</h2>
					<p>您有权访问、更正、删除您的个人信息。如有需要，请联系我们。</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">6. 联系我们</h2>
					<p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
					<p>邮箱：xdream@gmail.com</p>
				</section>

				<section className="mt-12 p-4 bg-gray-50 rounded">
					<p className="text-sm text-gray-600">
						本隐私政策可能会不时更新。重大更改将通过电子邮件或网站通知通知您。
					</p>
				</section>
			</div>
		</div>
	)
}
