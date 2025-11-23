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
			{
				protocol: 'https',
				hostname: 'images.rapgenius.com',
			},
		],
	},
	cacheComponents: true,
}

export default nextConfig
