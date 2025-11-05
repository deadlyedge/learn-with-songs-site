import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'images.genius.com',
			},
			{
				protocol: 'https',
				hostname: 'assets.genius.com',
			},
			{
				protocol: 'https',
				hostname: 't2.genius.com',
			},
		],
	},
}

export default nextConfig
