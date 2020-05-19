module.exports = {
  plugins: {
    'posthtml-expressions': {
      locals: {
        TITLE: process.env.REACT_APP_TITLE,
        CSS: process.env.REACT_APP_CSS
      }
    }
  }
}
