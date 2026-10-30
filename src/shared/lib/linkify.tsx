import { Fragment, type ReactNode } from 'react'

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g

export function linkify(text: string, linkClassName?: string): ReactNode {
  const parts = text.split(URL_PATTERN)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={(event) => event.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}
