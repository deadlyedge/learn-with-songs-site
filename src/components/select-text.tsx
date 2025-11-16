import { useEffect, useState } from 'react'

export const SelectText = () => {
	const [selection, setSelection] = useState<string>()
	const [position, setPosition] = useState<Record<string, number>>()

	function onLearning(text?: string) {
		const textToLearn = text || selection
		console.log('text', textToLearn)
	}

	useEffect(() => {
		function onSelectStart() {
			setSelection(undefined)
		}

		function onSelectEnd() {
			const activeSelection = document.getSelection()
			const text = activeSelection?.toString()

			// validate selection, need more
			if (
				!activeSelection ||
				!text ||
				text?.length > 30 ||
				text.includes('\n')
			) {
				setSelection(undefined)
				return
			}

			setSelection(text)

			const rect = activeSelection.getRangeAt(0).getBoundingClientRect()

			setPosition({
				x: rect.left + rect.width / 2 - 80 / 2 - 12,
				y: rect.top + window.scrollY - 30 - 12,
				width: rect.width,
				height: rect.height,
			})
		}
		document.addEventListener('selectstart', onSelectStart)
		document.addEventListener('mouseup', onSelectEnd)
		return () => {
			document.removeEventListener('selectstart', onSelectStart)
			document.removeEventListener('mouseup', onSelectEnd)
		}
	}, [])

	return (
		// eslint-disable-next-line jsx-a11y/role-supports-aria-props
		<div role="dialog" aria-labelledby="share" aria-haspopup="dialog">
			{selection && position && (
				<p
					className="
            absolute -top-14 left-0 bg-yellow-200 text-card-foreground rounded m-0 p-3
            after:absolute after:top-full after:left-1/2 after:-translate-x-2 after:h-0 after:w-0 after:border-x-[6px] after:border-x-transparent after:border-b-8 after:border-b-yellow-200 after:rotate-180 shadow
          "
					style={{
						transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
					}}>
					<button
						className="flex w-full h-full justify-between items-center px-2"
						onClick={() => onLearning()}>
						<span id="share" className="text-xs">
							Learn&nbsp;
							{selection.substring(0, 20) +
								(selection.length > 20 ? '...' : '')}
						</span>
					</button>
				</p>
			)}
		</div>
	)
}
