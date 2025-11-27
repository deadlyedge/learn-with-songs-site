import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { Button } from './ui/button'
import { ButtonGroup } from './ui/button-group'
import { useUserDataStore } from '@/stores/user-data'
import type { CollectionSong } from '@/types'
import { FILTER_SETTING } from '@/constants'

export const Filters = () => {
	const { collectionFilter, setCollectionFilter } = useUserDataStore()

	const handleChangeFilter = (key: keyof CollectionSong) => {
		let order: 'asc' | 'desc' = 'asc'
		if (collectionFilter.key === key) {
			order = collectionFilter.order === 'asc' ? 'desc' : 'asc'
		}
		setCollectionFilter({ key, order })
	}

	return (
		<ButtonGroup className="[--radius:9999rem]">
			{FILTER_SETTING.map(({ show, key }) => (
				<Button
					key={key}
					variant={collectionFilter.key === key ? 'default' : 'outline'}
					size="sm"
					className="flex items-center"
					onClick={() => handleChangeFilter(key)}>
					{show.charAt(0).toUpperCase() + show.slice(1)}
					{collectionFilter.key === key &&
						(collectionFilter.order === 'desc' ? (
							<ArrowDownRightIcon />
						) : (
							<ArrowUpRightIcon />
						))}
				</Button>
			))}
		</ButtonGroup>
	)
}
