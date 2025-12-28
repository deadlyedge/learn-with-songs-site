import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: '服务条款 | Learn English with Songs',
	description: 'Learn English with Songs 的服务条款页面',
}

export default function TermsOfServicePage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<h1 className="text-3xl font-bold mb-6">服务条款</h1>
			<div className="prose prose-lg max-w-none">
				<p className="text-sm text-gray-600 mb-8">
					最后更新日期：2025年11月21日
				</p>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">1. 接受条款</h2>
					<p>
						通过访问和使用Learn English with
						Songs服务，您同意受本服务条款的约束。如果您不同意这些条款，请勿使用我们的服务。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">2. 服务描述</h2>
					<p>
						Learn English with
						Songs是一款帮助用户通过歌曲学习英语的应用程序。我们提供歌词显示、注释、词汇学习和收藏功能。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">3. 用户账户</h2>
					<p>
						您须提供准确、完整的信息来注册账户。您负责维护账户的安全性，并对所有使用您的账户进行的活动负责。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">4. 可接受使用</h2>
					<p>您同意不会：</p>
					<ul className="list-disc pl-6 mt-2">
						<li>违反任何法律法规。</li>
						<li>侵犯他人知识产权。</li>
						<li>上传有害或不当内容。</li>
						<li>试图绕过我们的安全措施。</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">5. 内容所有权</h2>
					<p>
						我们尊重知识产权。您上传或提供的任何内容仍属于您的财产。我们拥有服务本身及相关知识产权。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">6. 免责声明</h2>
					<p>
						我们的服务按&quot;现状&quot;提供。我们不保证服务不会中断或无错误。您使用服务的风险由您自行承担。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">7. 责任限制</h2>
					<p>
						在法律法规允许的最大范围内，我们不对任何间接、偶然、特殊或后果性损害承担责任。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">8. 终止</h2>
					<p>
						我们保留随时终止或暂停您对服务的访问的权利，如有必要无需事先通知。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">9. 条款变更</h2>
					<p>
						我们可能会不时更新这些服务条款。重大更改将通过网站或电子邮件通知您。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">10. 适用法律</h2>
					<p>
						这些条款受中华人民共和国法律管辖。任何争议应提交至有管辖权的法院。
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">11. 联系我们</h2>
					<p>如果您对本服务条款有任何疑问，请通过以下方式联系我们：</p>
					<p>邮箱：xdream@gmail.com</p>
				</section>

				<section className="mt-12 p-4 bg-gray-50 rounded">
					<p className="text-sm text-gray-600">
						本服务条款构成您与Learn English with Songs之间的完整协议。
					</p>
				</section>
			</div>
		</div>
	)
}
