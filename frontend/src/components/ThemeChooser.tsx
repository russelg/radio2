import React, { FormEvent, FunctionComponent, useState } from 'react'
import { setStylesheet, useSiteSettingsContext } from '/contexts/settings'

export interface ThemeChooserProps {
  className?: string
}

const ThemeChooser: FunctionComponent<ThemeChooserProps> = ({ className }) => {
  const [{ styles, stylesheet }, dispatch] = useSiteSettingsContext()

  const stylesheetLink = document.getElementById(
    'change_stylesheet'
  ) as HTMLLinkElement | null

  const [selected, setSelected] = useState(
    stylesheet || (stylesheetLink && (stylesheetLink.href as string)) || ''
  )

  const onChange = (event: FormEvent<HTMLSelectElement>) => {
    const { value } = event.currentTarget as HTMLSelectElement
    setStylesheet(dispatch, value)
    setSelected(value)
  }

  return (
    <select className={className || ''} value={selected} onChange={onChange}>
      {styles &&
        Object.entries(styles).map(style => (
          <option key={style[0]} value={style[1]}>
            {style[0]}
          </option>
        ))}
    </select>
  )
}

export default ThemeChooser
