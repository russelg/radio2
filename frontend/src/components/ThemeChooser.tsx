import React, {
  FormEvent,
  FunctionComponent,
  useCallback,
  useState
} from 'react'
import { useSettingsContext } from '/contexts/settings'

export interface ThemeChooserProps {
  className?: string
}

const ThemeChooser: FunctionComponent<ThemeChooserProps> = ({ className }) => {
  const { styles, stylesheet, setStylesheet } = useSettingsContext()

  const stylesheetLink = document.getElementById(
    'change_stylesheet'
  ) as HTMLLinkElement | null

  const [selected, setSelected] = useState(
    stylesheet || (stylesheetLink && (stylesheetLink.href as string)) || ''
  )

  const onChange = useCallback((event: FormEvent<HTMLSelectElement>) => {
    const { value } = event.currentTarget as HTMLSelectElement
    setStylesheet(value)
    setSelected(value)
  }, [])

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
