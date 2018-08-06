import React from 'react'
import Pagination from 'react-js-pagination'
import { AsyncTypeahead, Highlighter } from 'react-bootstrap-typeahead'
import { Button, Col, Container, Form, Input, InputGroup, InputGroupAddon, Row } from 'reactstrap'
import queryString from 'query-string'
import Loader from '../components/Loader'
import Error from '../components/Error'
import SongsTable from '../components/SongsTable'
import './Home.css'
import './Songs.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css'
import { AlertList } from 'react-bs-notifier'
import { API_BASE, settings } from '../store'

class Songs extends React.Component {
  constructor(props) {
    super(props)

    const page = this.getSearchComponents(props.location.search).page

    this.state = {
      page,
      pagination: {
        per_page: 50,
        page: 1,
        pages: 1,
        total_count: 0
      },
      songs: [],
      loaded: false,
      error: '',
      search: '',
      query: null,
      typeaheadLoading: false,
      typeahead: [],
      alerts: []
    }

    this.handlePageChange = this.handlePageChange.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
    this.handlePage = this.handlePage.bind(this)
  }

  getSearchComponents(search) {
    const parsed = queryString.parse(search)
    const page = 'page' in parsed ? Number.parseInt(parsed.page, 10) : 1
    const query = 'query' in parsed ? (parsed.query || undefined) : undefined

    return {page, query}
  }

  firePageChange(search = null) {
    const {page, query} = this.getSearchComponents(search || this.props.location.search)

    this.handlePageChange(page, {query, history: false})
    this.getPage(page, query)
  }

  componentDidMount() {
    this.firePageChange()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.search !== this.props.location.search) {
      this.firePageChange(nextProps.location.search)
    }
  }

  getUrl(params) {
    return `songs?${queryString.stringify(params)}`
  }

  handlePageChange(page, {query = undefined, history = true}) {
    this.setState({loaded: false, page, search: query})

    const url = this.getUrl({page, query})
    if (history)
      this.props.history.push(`/${url}`)

    // we don't need to explicitly getPage here as componentWillReceiveProps
    // will do that in reaction to the location changing
  }

  getPage(page, query = undefined) {
    const url = this.getUrl({page, query})
    fetch(`${API_BASE}/${url}`)
      .then(res => {
        if (res.status === 422) {
          this.setState({error: 'Page does not exist', loaded: false})
          return
        }
        return res.json()
      })
      .then(result => {
        if (result !== undefined) {
          this.setState({
            page,
            pagination: result.pagination,
            songs: result.songs,
            query: result.query,
            loaded: true
          })
        }
      })
  }

  handleSearchChange(event) {
    this.setState({search: event.target.value || undefined})
  }

  handleSearch(event) {
    event.preventDefault()
    this.handlePage(1)
  }

  handlePage(i) {
    this.handlePageChange(i, {query: this.state.search, history: true})
  }

  requestSong(song) {
    const {id} = song
    fetch(`${API_BASE}/request`, {
      method: 'PUT',
      body: JSON.stringify({id: id}),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    })
      .then(res => res.json())
      .then(result => {
        console.log(result)

        const error = !('message' in result)
        let msg = error ? result.description : result.message

        const newAlert = {
          id: (new Date()).getTime(),
          message: msg,
          type: error ? 'danger' : 'success'
        }

        const {songs} = this.state
        const stateSong = songs.indexOf(song)
        songs[stateSong] = {...song, meta: result.meta}

        this.setState({
          alerts: [...this.state.alerts, newAlert],
          songs
        })
      })
  }

  onAlertDismissed(alert) {
    const alerts = this.state.alerts

    // find the index of the alert that was dismissed
    const idx = alerts.indexOf(alert)

    if (idx >= 0) {
      this.setState({
        // remove the alert from the array
        alerts: [...alerts.slice(0, idx), ...alerts.slice(idx + 1)]
      })

      console.log(this.state.alerts)
    }
  }

  render() {
    if (this.state.error !== '')
      return <Error>{this.state.error}</Error>

    if (!this.state.loaded)
      return <Loader />

    const pagination = <Pagination
      activePage={this.state.page}
      itemsCountPerPage={this.state.pagination.per_page}
      totalItemsCount={this.state.pagination.total_count}
      pageRangeDisplayed={this.state.pagination.total_count}
      onChange={this.handlePage}
      itemClass='page-item'
      linkClass='page-link'
      prevPageText='«'
      firstPageText='First'
      lastPageText='Last'
      nextPageText='»'
      innerClass='pagination justify-content-center'
    />

    return (
      <Container className='content-panel'>
        <AlertList
          alerts={this.state.alerts}
          timeout={2000}
          onDismiss={this.onAlertDismissed.bind(this)}
        />
        <Row>
          <Col>
            <InputGroup>
              <Input placeholder='Username' />
              <InputGroupAddon addonType='append'>
                <Button>Load Faves</Button>
              </InputGroupAddon>
            </InputGroup>
          </Col>
          <Col>
            <Form onSubmit={this.handleSearch}>
              <InputGroup>
                <AsyncTypeahead
                  labelKey='result'
                  filterBy={['result']}
                  renderMenuItemChildren={(result, props) => (
                    <span>
                      <b>{result.type}</b>:&nbsp;
                      <Highlighter search={props.text}>
                          {result.result}
                        </Highlighter>
                    </span>
                  )}
                  onInputChange={input => {
                    const search = input || undefined
                    this.setState({search})
                  }}
                  onChange={selected => {
                    const search = selected[0] || {result: ''}
                    this.setState({search: search.result})
                  }}
                  isLoading={this.state.typeaheadLoading}
                  onSearch={query => {
                    this.setState({typeaheadLoading: true})
                    fetch(`${API_BASE}/autocomplete?query=${query}`)
                      .then(resp => resp.json())
                      .then(json => this.setState({
                        typeaheadLoading: false,
                        typeahead: json.suggestions
                      }))
                  }}
                  placeholder='Search'
                  options={this.state.typeahead}
                  defaultInputValue={this.state.search}
                  highlightOnlyResult={true}
                  minLength={1}
                  selectHintOnEnter={false}
                  caseSensitive={false}
                />

                <InputGroupAddon addonType='append'>
                  <Button>Search</Button>
                </InputGroupAddon>
              </InputGroup>
            </Form>
          </Col>
        </Row>
        <Row>
          <Col className='justify-content-center'>
            <hr />
            {pagination}
            <hr />
          </Col>
        </Row>
        <Row>
          <Col>
            {this.state.songs.length === 0 && (
              <h2 className='mx-auto text-center'>No results</h2>
            )}
            {this.state.songs.length !== 0 && (
              <SongsTable
                songs={this.state.songs}
                requestSong={this.requestSong.bind(this)}
                downloads={settings.downloads_enabled}
              />
            )}
            <hr />
          </Col>
        </Row>
        <Row>
          <Col className='justify-content-center'>
            {pagination}
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Songs
