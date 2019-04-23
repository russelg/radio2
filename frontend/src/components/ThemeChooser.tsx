import React from 'react'
import { view } from 'react-easy-state'

export interface State {
  selected: string
}

export interface Props {
  styles: { [k: string]: string }
}

class ThemeChooser extends React.Component<Props, State> {
  state = {
    selected: localStorage.hasOwnProperty('css')
      ? localStorage['css']
      : document.querySelector<HTMLLinkElement>('#change_stylesheet')!.href,
  }

  constructor(props: Props) {
    super(props)
    this.onChange = this.onChange.bind(this)
  }

  onChange(event: React.FormEvent<EventTarget>) {
    let target = event.target as HTMLSelectElement
    const css = target.value
    document.querySelector<HTMLLinkElement>('#change_stylesheet')!.href = css
    localStorage['css'] = css
    this.setState({ selected: css })
  }

  render() {
    return (
      <select
        id="theme_chooser"
        value={this.state.selected}
        onChange={this.onChange}>
        {Object.entries(this.props.styles).map(style => (
          <option key={style[0]} value={style[1]}>
            {style[0]}
          </option>
        ))}
      </select>
    )
  }
}

export default view(ThemeChooser)
