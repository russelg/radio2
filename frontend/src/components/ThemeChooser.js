import React from 'react'
import { view } from 'react-easy-state'

class ThemeChooser extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selected: localStorage.hasOwnProperty('css')
        ? localStorage['css']
        : document.querySelector('#change_stylesheet').href,
    }

    this.onChange = this.onChange.bind(this)
  }

  onChange(event) {
    const css = event.target.value
    document.querySelector('#change_stylesheet').href = css
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
