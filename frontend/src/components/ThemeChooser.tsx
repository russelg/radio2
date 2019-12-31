import React, { FunctionComponent, useState, FormEvent } from 'react'
import { view } from 'react-easy-state'

export interface ThemeChooserProps {
  styles: { [k: string]: string }
  className?: string
}

const ThemeChooser: FunctionComponent<ThemeChooserProps> = ({
  styles,
  className
}) => {
  const [selected, setSelected] = useState(
    (localStorage.hasOwnProperty('css')
      ? localStorage['css']
      : document.querySelector<HTMLLinkElement>('#change_stylesheet')!
          .href) as string
  )

  const [loading, setLoading] = useState(false)

  const onChange = (event: FormEvent<HTMLSelectElement>) => {
    setLoading(true)
    const { value } = event.currentTarget as HTMLSelectElement
    document.querySelector<HTMLLinkElement>('#change_stylesheet')!.href = value
    localStorage['css'] = value
    setSelected(value)
  }

  return (
    <select className={className || ''} value={selected} onChange={onChange}>
      {Object.entries(styles).map(style => (
        <option key={style[0]} value={style[1]}>
          {style[0]}
        </option>
      ))}
    </select>
  )
}

export default view(ThemeChooser)
