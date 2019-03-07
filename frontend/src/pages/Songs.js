import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import 'filepond/dist/filepond.min.css'
import queryString from 'query-string'
import React from 'react'
import { AsyncTypeahead, Highlighter } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import { AlertList } from 'react-bs-notifier'
import { view } from 'react-easy-state'
import { FilePond, registerPlugin } from 'react-filepond'
import Pagination from 'react-js-pagination'
import { withRouter } from 'react-router-dom'
import {
  Button,
  Col,
  Container,
  Form,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
  Label,
  Row,
} from 'reactstrap'
import Error from '../components/Error'
import LoaderSpinner from '../components/LoaderSpinner'
import SongsTable from '../components/SongsTable'
import { API_BASE, auth, settings } from '../store'
import './Home.css'
import './Songs.css'

registerPlugin(FilePondPluginFileValidateType)

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
        total_count: 0,
      },
      songs: [],
      loaded: false,
      error: '',
      search: '',
      query: null,
      typeaheadLoading: false,
      typeahead: [],
      alerts: [],
      username: null,
      files: [],
      show_admin: true,
      location: new URL(window.location.href),
    }

    this.handleAdminChange = this.handleAdminChange.bind(this)
    this.handlePageChange = this.handlePageChange.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleFavesChange = this.handleFavesChange.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
    this.handleFaves = this.handleFaves.bind(this)
    this.handlePage = this.handlePage.bind(this)
    this.sendAlert = this.sendAlert.bind(this)
  }

  sendAlert(msg, error) {
    const newAlert = {
      id: new Date().getTime(),
      message: msg,
      type: error ? 'danger' : 'success',
    }

    this.setState({
      alerts: [...this.state.alerts, newAlert],
    })
  }

  getSearchComponents(search) {
    const parsed = queryString.parse(search)
    const page = 'page' in parsed ? Number.parseInt(parsed.page, 10) : 1
    const query = 'query' in parsed ? parsed.query || undefined : undefined
    const username = 'user' in parsed ? parsed.user || undefined : undefined

    return { page, query, username }
  }

  firePageChange(search = null) {
    const propSearch = this.props.location.search
    const { page, query, username } = this.getSearchComponents(
      search !== null ? search : propSearch
    )

    this.handlePageChange(page, { query, history: false, username })
    this.getPage(page, query, username)
  }

  componentWillMount() {
    this.unlisten = this.props.history.listen((location, action) => {
      if (location.pathname === this.state.location.pathname) {
        this.setState({ location })
        this.firePageChange(location.search)
      }
    })
  }

  componentWillUnmount() {
    this.unlisten()
  }

  componentDidMount() {
    this.firePageChange()
  }

  reloadPage() {
    this.firePageChange()
  }

  getUrl(params, favourites = false) {
    // remove page from the query should it be 1 (the default)
    if (params.page === 1) delete params.page

    if ((this.props.favourites || favourites) && params.user)
      return `favourites?${queryString.stringify(params)}`

    return `songs?${queryString.stringify(params)}`
  }

  handlePageChange(
    page,
    {
      query = undefined,
      history = true,
      username = undefined,
      force_refresh = true,
      favourites = false,
    }
  ) {
    this.setState({ loaded: !force_refresh, page, search: query, username })

    const url = this.getUrl({ page, query, user: username }, favourites)
    if (history) this.props.history.push(`/${url}`)
  }

  getPage(page, query = undefined, username = undefined) {
    const url = this.getUrl({ page, query, user: username })
    fetch(`${API_BASE}/${url}`)
      .then(async res => {
        if (res.status === 422 || res.status !== 200) {
          const json = await res.clone().json()
          this.setState({ error: json.description, loaded: false })
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
            loaded: true,
          })
        }
      })
  }

  handleAdminChange(event) {
    this.setState({ show_admin: event.target.checked })
  }

  handleSearchChange(event) {
    this.setState({ search: event.target.value || undefined })
  }

  handleFavesChange(event) {
    this.setState({ username: event.target.value || undefined })
  }

  handleSearch(event) {
    event.preventDefault()
    this.handlePage(1)
  }

  handleFaves(event) {
    event.preventDefault()
    if (this.state.username !== undefined || auth.username)
      this.handlePage(1, true)
  }

  handlePage(i, favourites = false) {
    this.handlePageChange(i, {
      query: this.state.search,
      history: true,
      username: this.state.username,
      favourites,
    })
  }

  requestSong(song) {
    const { id } = song
    fetch(`${API_BASE}/request`, {
      method: 'PUT',
      body: JSON.stringify({ id: id }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(res => res.json())
      .then(result => {
        const error = result.error !== null
        let msg = 'description' in result ? result.description : result.message
        this.sendAlert(msg, error)

        if (!error) {
          const { songs } = this.state
          const stateSong = songs.indexOf(song)
          songs[stateSong] = { ...song, meta: result.meta }
          this.setState({ songs })
        }
      })
  }

  deleteSong(song) {
    const { id } = song
    fetch(`${API_BASE}/song/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(result => {
        const error = result.error !== null
        let msg = 'description' in result ? result.description : result.message
        this.sendAlert(msg, error)

        if (!error) {
          const { songs } = this.state
          this.setState({ songs: songs.filter(item => item !== song) })
        }
      })
  }

  refreshSong(song) {
    fetch(`${API_BASE}/song/${song}`, { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const { songs } = this.state
        const stateSong = songs.indexOf(song)
        if (stateSong > -1) songs[stateSong] = { ...song, ...result }

        this.setState({ songs: [result, ...songs] })
      })
  }

  downloadSong(song) {
    const { id } = song
    fetch(`${API_BASE}/auth/download`, {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(response => {
        response
          .clone()
          .json()
          .then(resp => {
            if ('download_token' in resp) {
              const token = resp.download_token
              const link = document.createElement('a')
              document.body.appendChild(link)
              link.href = `${API_BASE}/download?token=${token}`
              link.setAttribute('type', 'hidden')
              link.click()
            } else {
              const error = resp.error !== null
              let msg = 'description' in resp ? resp.description : resp.message
              this.sendAlert(msg, `Error downloading: ${error}`)
            }
          })
      })
      .catch(error => {
        throw error
      })
  }

  favouriteSong(song, unfavourite = false) {
    const { id, meta } = song
    const { songs } = this.state

    let method = 'PUT'
    if (unfavourite) method = 'DELETE'

    fetch(`${API_BASE}/favourites`, {
      method,
      body: JSON.stringify({ id: id }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(res => res.json())
      .then(result => {
        const error = result.error !== null
        let msg = 'description' in result ? result.description : result.message
        this.sendAlert(msg, error)

        if (!error) {
          const stateSong = songs.indexOf(song)
          meta.favourited = !meta.favourited
          songs[stateSong] = { ...song, meta }
        }

        this.setState({ songs })
      })
  }

  updateSongMetadata(song, options) {
    const { id } = song
    const { songs } = this.state

    fetch(`${API_BASE}/song/${id}`, {
      method: 'PUT',
      body: JSON.stringify(options),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(res => res.json())
      .then(result => {
        const error = result.error !== null
        let msg = 'description' in result ? result.description : result.message
        this.sendAlert(msg, error)

        if (!error) {
          const stateSong = songs.findIndex(element => element.id === id)

          // remove non-song keys
          delete result.status_code
          delete result.error
          delete result.description

          songs[stateSong] = { ...song, ...result }
        }

        this.setState({ songs })
      })
  }

  onAlertDismissed(alert) {
    const alerts = this.state.alerts

    // find the index of the alert that was dismissed
    const idx = alerts.indexOf(alert)

    if (idx >= 0) {
      this.setState({
        // remove the alert from the array
        alerts: [...alerts.slice(0, idx), ...alerts.slice(idx + 1)],
      })
    }
  }

  render() {
    if (this.state.error !== '') return <Error>{this.state.error}</Error>

    const pagination = (
      <Pagination
        activePage={this.state.page}
        itemsCountPerPage={this.state.pagination.per_page}
        totalItemsCount={this.state.pagination.total_count}
        pageRangeDisplayed={this.state.pagination.total_count}
        onChange={this.handlePage}
        itemClass="page-item"
        linkClass="page-link"
        prevPageText="«"
        firstPageText="First"
        lastPageText="Last"
        nextPageText="»"
        innerClass="pagination justify-content-center"
      />
    )

    return (
      <Container className="content-panel">
        <AlertList
          alerts={this.state.alerts}
          timeout={2000}
          onDismiss={this.onAlertDismissed.bind(this)}
        />
        {auth.admin && (
          <Row>
            <Col>
              <Form>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={this.state.show_admin}
                      onChange={this.handleAdminChange}
                    />{' '}
                    Enable admin-only functionality
                  </Label>
                </FormGroup>
              </Form>
              <hr />
            </Col>
          </Row>
        )}
        {(settings.uploads_enabled ||
          (auth.admin && this.state.show_admin)) && (
          <Row>
            <Col>
              <FilePond
                ref={ref => (this.pond = ref)}
                name="song"
                acceptedFileTypes={['audio/*']}
                files={this.state.files}
                allowMultiple={true}
                maxFiles={10}
                instantUpload={true}
                server={{
                  process: {
                    url: `${API_BASE}/upload`,
                    onload: response => {
                      const json = JSON.parse(response)
                      return json.id
                    },
                    headers: {
                      Authorization: `Bearer ${auth.access_token}`,
                    },
                  },
                  fetch: null,
                  revert: null,
                }}
                onupdatefiles={fileItems => {
                  this.setState({
                    files: fileItems.map(fileItem => fileItem.file),
                  })
                }}
                onprocessfile={(err, file) => {
                  if (!err) {
                    const uploadedId = String(file.serverId)
                    this.sendAlert('Song uploaded!', false)
                    this.refreshSong(uploadedId)
                  } else {
                    let msg = 'Song upload failed'
                    if (err.code === 413) msg += ' (file too large)'
                    this.sendAlert(msg, true)
                  }
                }}
              />
              <hr />
            </Col>
          </Row>
        )}
        <Row>
          <Col>
            <Form onSubmit={this.handleFaves}>
              <InputGroup>
                <Input
                  placeholder="Username"
                  value={this.state.username || ''}
                  onChange={this.handleFavesChange}
                />
                <InputGroupAddon addonType="append">
                  <Button>Load Faves</Button>
                </InputGroupAddon>
              </InputGroup>
            </Form>
          </Col>
          <Col>
            <Form onSubmit={this.handleSearch}>
              <InputGroup>
                <AsyncTypeahead
                  labelKey="result"
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
                    this.setState({ search })
                  }}
                  onChange={selected => {
                    const search = selected[0] || { result: '' }
                    this.setState({ search: search.result })
                  }}
                  onKeyDown={event => {
                    // only submit on enter if the user has not selected a typeahead option
                    if (
                      event.keyCode === 13 &&
                      this.state.search === event.target.defaultValue
                    ) {
                      this.handleSearch(event)
                    }
                  }}
                  isLoading={this.state.typeaheadLoading}
                  onSearch={query => {
                    this.setState({ typeaheadLoading: true })
                    fetch(`${API_BASE}/autocomplete?query=${query}`)
                      .then(resp => resp.json())
                      .then(json =>
                        this.setState({
                          typeaheadLoading: false,
                          typeahead: json.suggestions,
                        })
                      )
                  }}
                  placeholder="Search"
                  options={this.state.typeahead}
                  defaultInputValue={this.state.search}
                  highlightOnlyResult={false}
                  minLength={1}
                  selectHintOnEnter={false}
                  caseSensitive={false}
                />
                <InputGroupAddon addonType="append">
                  <Button>Search</Button>
                </InputGroupAddon>
              </InputGroup>
            </Form>
          </Col>
        </Row>
        <Row>
          <Col className="justify-content-center">
            <hr />
            {pagination}
            <hr />
          </Col>
        </Row>
        {!this.state.loaded && (
          <Row>
            <LoaderSpinner />
          </Row>
        )}
        {this.state.loaded && (
          <Row>
            <Col>
              {this.state.songs.length === 0 && (
                <h2 className="mx-auto text-center">No results</h2>
              )}
              {this.state.songs.length !== 0 && (
                <SongsTable
                  songs={this.state.songs}
                  requestSong={this.requestSong.bind(this)}
                  favouriteSong={this.favouriteSong.bind(this)}
                  deleteSong={this.deleteSong.bind(this)}
                  updateSongMetadata={this.updateSongMetadata.bind(this)}
                  downloads={
                    settings.downloads_enabled ||
                    (auth.admin && this.state.show_admin)
                  }
                  isAdmin={auth.admin && this.state.show_admin}
                  downloadSong={this.downloadSong.bind(this)}
                  loggedIn={auth.logged_in}
                  reloadPage={this.reloadPage.bind(this)}
                />
              )}
            </Col>
          </Row>
        )}
        <hr />
        <Row>
          <Col className="justify-content-center">{pagination}</Col>
        </Row>
      </Container>
    )
  }
}

export default view(withRouter(props => <Songs {...props} />))
