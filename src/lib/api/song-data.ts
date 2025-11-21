import { cache } from 'react'

import { getSongDetails as getSongDetailsAction } from '@/actions/details'
import { getSongLyrics as getSongLyricsAction } from '@/actions/lyrics'
import { getSongReferents as getSongReferentsAction } from '@/actions/referents'

export const getSongDetails = cache(getSongDetailsAction)
export const getSongLyrics = cache(getSongLyricsAction)
export const getSongReferents = cache(getSongReferentsAction)
