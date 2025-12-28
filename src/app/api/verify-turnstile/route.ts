import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	const { token } = await req.json()

	console.log('challenged')

	const secret = process.env.TURNSTILE_SECRET_KEY
	if (!secret) {
		return NextResponse.json(
			{ error: 'Turnstile secret not configured' },
			{ status: 500 },
		)
	}

	const params = new URLSearchParams({
		secret,
		response: token,
	})

	const res = await fetch(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params,
		},
	)
	const data = await res.json()

	return NextResponse.json({ success: data.success })
}
