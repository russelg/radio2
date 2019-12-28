// @ts-ignore
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import 'filepond/dist/filepond.min.css'
import queryString from 'query-string'
import React from 'react'
import { AsyncTypeahead, Highlighter } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
// @ts-ignore
import { AlertList } from 'react-bs-notifier'
import { view } from 'react-easy-state'
import { FilePond, registerPlugin } from 'react-filepond'
import Pagination from 'react-js-pagination'
import { RouteComponentProps, withRouter } from 'react-router-dom'
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
import {
  ApiBaseResponse,
  ApiResponse,
  AutocompleteItemJson,
  AutocompleteJson,
  Description,
  SongDownloadJson,
  SongItem,
  SongRequestJson,
  SongsJson,
} from '/api/Schemas'
import Error from '/components/Error'
import LoaderSpinner from '/components/LoaderSpinner'
import SongsTable from '/components/SongsTable'
import '/pages/Home.css'
import '/pages/Songs.css'
import { API_BASE, auth, settings } from '/store'

registerPlugin(FilePondPluginFileValidateType)

export interface AlertError {
  id: number
  message: string
  type: 'success' | 'danger'
}

export interface ParsedQueryParams {
  page: number
  query?: string | null
  user?: string | null
  [key: string]: unknown
}

export interface PageChangeOptions {
  query?: string | null
  user?: string | null
  history?: boolean
  force_refresh?: boolean
  favourites?: boolean
}

export interface Props extends RouteComponentProps<any> {
  favourites: boolean
}

export interface State {
  page: number
  pagination: {
    per_page: number
    page: number
    pages: number
    total_count: number
  }
  songs: SongItem[]
  loaded: boolean
  error: Description | null
  query?: string | null
  typeaheadLoading: boolean
  typeahead: any[]
  alerts: AlertError[]
  user?: string | null
  files: any[]
  show_admin: boolean
  location: URL
}

class Songs extends React.Component<Props, State> {
  state = {
    page: 0,
    pagination: {
      per_page: 50,
      page: 1,
      pages: 1,
      total_count: 0,
    },
    songs: [] as SongItem[],
    loaded: false,
    error: null,
    query: null,
    typeaheadLoading: false,
    typeahead: [],
    alerts: [] as AlertError[],
    user: null,
    files: [],
    show_admin: localStorage.getItem('show_admin') === 'true',
    location: new URL(window.location.href),
  }

  unlisten: any
  pond: FilePond | null

  constructor(props: Props) {
    super(props)

    this.state.page = Songs.getSearchComponents(props.location.search).page
    this.pond = null

    this.handleAdminChange = this.handleAdminChange.bind(this)
    this.handlePageChange = this.handlePageChange.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleFavesChange = this.handleFavesChange.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
    this.handleFaves = this.handleFaves.bind(this)
    this.handlePage = this.handlePage.bind(this)
    this.sendAlert = this.sendAlert.bind(this)
    this.onAlertDismissed = this.onAlertDismissed.bind(this)
    this.requestSong = this.requestSong.bind(this)
    this.favouriteSong = this.favouriteSong.bind(this)
    this.deleteSong = this.deleteSong.bind(this)
    this.updateSongMetadata = this.updateSongMetadata.bind(this)
    this.downloadSong = this.downloadSong.bind(this)
    this.reloadPage = this.reloadPage.bind(this)
  }

  static getSearchComponents(search?: string): ParsedQueryParams {
    const parsed = new URLSearchParams(search || '')
    const page = parseInt(parsed.get('page') || '1', 10) || 1
    const query = parsed.get('query') || undefined
    const user = parsed.get('user') || undefined

    return { page, query, user }
  }

  sendAlert(msg: string, error: boolean): void {
    const newAlert: AlertError = {
      id: new Date().getTime(),
      message: msg,
      type: error ? 'danger' : 'success',
    }

    this.setState({
      alerts: [...this.state.alerts, newAlert],
    })
  }

  firePageChange(search?: string): void {
    const propSearch = this.props.location.search
    const { page, query, user } = Songs.getSearchComponents(
      search !== undefined ? search : propSearch
    )

    this.handlePageChange(page, { user, query, history: false })
    this.getPage(page, { query, user })
  }

  componentWillMount(): void {
    this.unlisten = this.props.history.listen(location => {
      if (location.pathname === this.state.location.pathname) {
        const url = new URL(window.location.href)
        url.search = location.search
        url.pathname = location.pathname

        this.setState({ location: url })
        this.firePageChange(url.search)
      }
    })
  }

  componentWillUnmount(): void {
    if (this.unlisten !== null) this.unlisten()
  }

  componentDidMount(): void {
    this.reloadPage()
  }

  reloadPage(): void {
    this.firePageChange()
  }

  getUrl(params: ParsedQueryParams, favourites: boolean = false): string {
    // remove page from the query should it be 1 (the default)
    if (params.page === 1) delete params.page

    if (params.query === null) delete params.query
    if (params.user === null) delete params.user

    if ((this.props.favourites || favourites) && params.user) {
      return `favourites?${queryString.stringify(params)}`
    }

    return `songs?${queryString.stringify(params)}`
  }

  handlePageChange(
    page: number,
    {
      query = undefined,
      history = true,
      user = undefined,
      force_refresh = true,
      favourites = false,
    }: PageChangeOptions
  ): void {
    this.setState({ page, query, user, loaded: !force_refresh })

    const url = this.getUrl({ page, query, user }, favourites)
    if (history) this.props.history.push(`/${url}`)
  }

  getPage(
    page: number,
    {
      query = undefined,
      user = undefined,
    }: { query?: string | null; user?: string | null }
  ): void {
    const url = this.getUrl({ page, query, user })
    this.setState({ loaded: false })
    fetch(`${API_BASE}/${url}`)
      .then(async res => {
        if (res.status !== 200) {
          const json: ApiResponse<SongsJson> = await res.clone().json()
          this.setState({ error: json.description, loaded: false })
          return
        }
        return res.json()
      })
      .then((result: ApiResponse<SongsJson>) => {
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

  handleAdminChange(event: React.FormEvent<EventTarget>): void {
    const target = event.target as HTMLInputElement
    localStorage.setItem('show_admin', target.checked.toString())
    this.setState({ show_admin: target.checked })
  }

  handleSearchChange(event: React.FormEvent<EventTarget>): void {
    const target = event.target as HTMLInputElement
    this.setState({ query: target.value || '' })
  }

  handleFavesChange(event: React.FormEvent<EventTarget>): void {
    const target = event.target as HTMLInputElement
    this.setState({ user: target.value || '' })
  }

  handleSearch(event: React.FormEvent<EventTarget>): void {
    event.preventDefault()
    this.handlePage(1)
  }

  handleFaves(event: React.FormEvent<EventTarget>): void {
    event.preventDefault()
    if (this.state.user !== undefined || auth.username) this.handlePage(1, true)
  }

  handlePage(i: number, favourites: boolean = false): void {
    this.handlePageChange(i, {
      favourites,
      query: this.state.query,
      history: true,
      user: this.state.user,
    })
  }

  requestSong(song: SongItem): void {
    const { id } = song
    fetch(`${API_BASE}/request`, {
      method: 'PUT',
      body: JSON.stringify({ id }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(res => res.json())
      .then((result: ApiResponse<SongRequestJson>) => {
        const error = result.error !== null
        const msg = (result.description as string) || ''
        this.sendAlert(msg, error)

        if (!error) {
          const { songs } = this.state
          const stateSong: number = songs.findIndex(
            element => element.id === id
          )
          songs[stateSong] = { ...song, meta: result.meta }
          this.setState({ songs })
        }
      })
  }

  deleteSong(song: SongItem): void {
    const { id } = song
    fetch(`${API_BASE}/song/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then((result: ApiBaseResponse) => {
        const error = result.error !== null
        const msg = result.description || ''
        if (typeof msg === 'string') {
          this.sendAlert(msg, error)
        }

        if (!error) {
          const { songs } = this.state
          this.setState({ songs: songs.filter(item => item !== song) })
        }
      })
  }

  refreshSong(song: string): void {
    fetch(`${API_BASE}/song/${song}`, { method: 'GET' })
      .then(res => res.json())
      .then((result: ApiResponse<SongItem>) => {
        const { songs } = this.state
        const stateSong = songs.findIndex(element => element.id === song)
        if (stateSong > -1) {
          songs[stateSong] = { ...songs[stateSong], ...result }
        }

        this.setState({ songs: [result, ...songs] })
      })
  }

  downloadSong(song: SongItem): void {
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
          .then((resp: ApiResponse<SongDownloadJson>) => {
            if ('download_token' in resp) {
              const token = resp.download_token
              const link = document.createElement('a')
              document.body.appendChild(link)
              link.href = `${API_BASE}/download?token=${token}`
              link.setAttribute('type', 'hidden')
              link.click()
            } else {
              const error = resp.error !== null
              const msg = resp.description || ''
              this.sendAlert(`Error downloading: ${msg}`, error)
            }
          })
      })
      .catch(error => {
        throw error
      })
  }

  favouriteSong(song: SongItem, unfavourite = false): void {
    const { id, meta } = song
    const { songs } = this.state

    let method = 'PUT'
    if (unfavourite) method = 'DELETE'

    fetch(`${API_BASE}/favourites`, {
      method,
      body: JSON.stringify({ id }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(res => res.json())
      .then((result: ApiBaseResponse) => {
        const error = result.error !== null
        const msg = result.description || ''
        if (typeof msg === 'string') {
          this.sendAlert(msg, error)
        }

        if (!error) {
          const stateSong = songs.findIndex(element => element.id === id)
          meta.favourited = !meta.favourited
          songs[stateSong] = { ...song, meta }
        }

        this.setState({ songs })
      })
  }

  updateSongMetadata(
    song: SongItem,
    options: { artist?: string; title?: string }
  ): void {
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
      .then((result: ApiResponse<SongItem>) => {
        const error = result.error !== null
        const msg = result.description || ''
        if (typeof msg === 'string') {
          this.sendAlert(msg, error)
        }

        if (!error) {
          const stateSong = songs.findIndex(element => element.id === id)
          songs[stateSong] = { ...song, ...result }
        }

        this.setState({ songs })
      })
  }

  onAlertDismissed(alert: AlertError): void {
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
    if (this.state.error && this.state.error !== '') {
      return <Error errors={this.state.error} />
    }

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

    // @ts-ignore
    return (
      <Container className="content-panel">
        <AlertList
          alerts={this.state.alerts}
          timeout={2000}
          onDismiss={this.onAlertDismissed}
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
                // @ts-ignore
                server={{
                  process: {
                    url: `${API_BASE}/upload`,
                    onload: (response: string) => {
                      const json: { id: string } = JSON.parse(response)
                      return json.id
                    },
                    headers: {
                      Authorization: `Bearer ${auth.access_token}`,
                    },
                  },
                  fetch: '',
                  revert: '',
                  load: '',
                  restore: '',
                }}
                onupdatefiles={fileItems => {
                  this.setState({
                    files: fileItems.map(fileItem => fileItem.file),
                  })
                }}
                onprocessfile={(err, file) => {
                  if (!err) {
                    // @ts-ignore
                    const uploadedId = String(file.serverId)
                    this.sendAlert('Song uploaded!', false)
                    this.refreshSong(uploadedId)
                  } else {
                    let msg = 'Song upload failed'
                    // @ts-ignore
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
                  value={this.state.user || ''}
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
                  id="search"
                  labelKey="result"
                  filterBy={['result']}
                  renderMenuItemChildren={(
                    result: AutocompleteItemJson,
                    props
                  ) => (
                    <span>
                      <b>{result.type}</b>:&nbsp;
                      <Highlighter search={props.text || ''}>
                        {result.result}
                      </Highlighter>
                    </span>
                  )}
                  onInputChange={input => {
                    const query = input || null
                    this.setState({ query })
                  }}
                  onChange={(selected: AutocompleteItemJson[]) => {
                    const res: AutocompleteItemJson = selected[0] || {
                      result: '',
                    }
                    this.setState({ query: res.result })
                  }}
                  // @ts-ignore
                  onKeyDown={(event: any) => {
                    // only submit on enter if the user has not selected a typeahead option
                    if (
                      event.keyCode === 13 &&
                      this.state.query === event.target.defaultValue
                    ) {
                      this.handleSearch(event)
                    }
                  }}
                  isLoading={this.state.typeaheadLoading}
                  onSearch={(query: string) => {
                    this.setState({ typeaheadLoading: true })
                    fetch(`${API_BASE}/autocomplete?query=${query}`)
                      .then(resp => resp.json())
                      .then((json: ApiResponse<AutocompleteJson>) =>
                        this.setState({
                          typeaheadLoading: false,
                          typeahead: json.suggestions,
                        })
                      )
                  }}
                  placeholder="Search"
                  options={this.state.typeahead}
                  defaultInputValue={this.state.query || ''}
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
        <Row>
          <Col>
            {this.state.loaded ? (
              this.state.songs.length === 0 && (
                <h2 className="mx-auto text-center">No results</h2>
              )
            ) : (
              <LoaderSpinner
                style={{
                  zIndex: 1,
                  position: 'absolute',
                  background: 'rgba(255,255,255,0.5)',
                  height: '100%',
                  left: '0',
                }}
              />
            )}
            {this.state.songs.length !== 0 && (
              <SongsTable
                songs={this.state.songs}
                requestSong={this.requestSong}
                favouriteSong={this.favouriteSong}
                deleteSong={this.deleteSong}
                updateSongMetadata={this.updateSongMetadata}
                downloads={
                  settings.downloads_enabled ||
                  (auth.admin && this.state.show_admin)
                }
                isAdmin={auth.admin ? this.state.show_admin : false}
                downloadSong={this.downloadSong}
                loggedIn={auth.logged_in}
                reloadPage={this.reloadPage}
              />
            )}
          </Col>
        </Row>
        <hr />
        <Row>
          <Col className="justify-content-center">{pagination}</Col>
        </Row>
      </Container>
    )
  }
}

export default withRouter(view((props: Props) => <Songs {...props} />))
