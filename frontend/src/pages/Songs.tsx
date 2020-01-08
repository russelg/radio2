import { cx } from 'emotion'
// @ts-ignore
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import 'filepond/dist/filepond.min.css'
import React, {
  FormEvent,
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { AsyncTypeahead, Highlighter } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import { File as FilePondFile, FilePond, registerPlugin } from 'react-filepond'
import Pagination from 'react-js-pagination'
import { RouteComponentProps, useHistory, withRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
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
  Row
} from 'reactstrap'
import {
  NumberParam,
  stringify,
  StringParam,
  useQueryParams
} from 'use-query-params'
import {
  ApiBaseResponse,
  ApiResponse,
  AutocompleteItemJson,
  AutocompleteJson,
  Description,
  SongItem,
  SongsJson
} from '/api/Schemas'
import Error from '/components/Error'
import LoaderSpinner from '/components/LoaderSpinner'
import SongsTable from '/components/SongsTable'
import { API_BASE } from '/store'
import {
  containerWidthStyle,
  navbarMarginStyle,
  useDelayedLoader,
  useLocalStorage
} from '/utils'
import { useAuthContext } from '/contexts/auth'
import { useSettingsContext } from '/contexts/settings'
import NotificationToast from '/components/NotificationToast'
import { animated, useSpring } from 'react-spring'

registerPlugin(FilePondPluginFileValidateType)

interface SongUploadFormProps {
  refreshSong: (song: string) => void
}

const SongUploadForm: FunctionComponent<SongUploadFormProps> = ({
  refreshSong
}) => {
  const { accessToken } = useAuthContext()

  const pond = useRef<FilePond>(null)
  const [files, setFiles] = useState<FilePondFile[]>([])

  const server = {
    process: {
      url: `${API_BASE}/upload`,
      onload: (response: string) => {
        const json: { id: string } = JSON.parse(response)
        return json.id
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }

  const onupdatefiles = useCallback(
    fileItems => {
      setFiles(fileItems)
    },
    [setFiles]
  )

  const onprocessfile = useCallback(
    (err, file) => {
      if (!err) {
        // @ts-ignore
        toast(<NotificationToast>Song uploaded!</NotificationToast>)
        refreshSong(file.serverId)

        // remove file after uploaded
        pond.current && pond.current.removeFile(file.id)
        setFiles(files => files.filter(itm => itm.file !== file.file))
      } else {
        let msg = 'Song upload failed'
        // @ts-ignore
        if (err.code === 413) msg += ' (file too large)'
        toast(<NotificationToast error>{msg}</NotificationToast>)
      }
    },
    [refreshSong, setFiles]
  )

  return (
    <FilePond
      ref={pond}
      name="song"
      acceptedFileTypes={['audio/*']}
      files={files}
      allowMultiple={true}
      maxFiles={10}
      instantUpload={true}
      // @ts-ignore
      server={server}
      onupdatefiles={onupdatefiles}
      onprocessfile={onprocessfile}
    />
  )
}

interface SongsQuery {
  query?: string | null
  page?: number | null
  user?: string | null
}

function getApiUrl(params: SongsQuery, favourites: boolean): string {
  const options = { ...params }
  const endpoint = favourites && options.user ? 'favourites' : 'songs'

  // remove page from the query should it be 1 (the default)
  if (params.page === 1) delete params.page
  if (params.query === null) delete params.query
  if (params.user === null) delete params.user

  return `/${endpoint}?${stringify(params)}`
}

interface SearchFieldProps {
  query?: string
  setQuery: (query: string) => void
}

const SearchField: FunctionComponent<SearchFieldProps> = ({
  query = '',
  setQuery
}) => {
  const [input, setInput] = useState<string>(query)
  const [loading, setLoading] = useState<boolean>(false)
  const [options, setOptions] = useState<AutocompleteItemJson[]>([])

  const [typeahead, setTypeahead] = useState<any>(null)

  const onSubmit = useCallback(
    event => {
      event.preventDefault()
      setQuery(input)
    },
    [setQuery, input]
  )

  const onChange = useCallback(
    (selected: AutocompleteItemJson[]) => {
      const res: AutocompleteItemJson = selected[0] || {
        result: ''
      }
      setInput(res.result)
    },
    [setInput]
  )

  const onKeyDown = useCallback(
    (event: any) => {
      // only submit on enter if the user has not selected a typeahead option
      if (event.keyCode === 13 && input === event.target.defaultValue) {
        event.preventDefault()
        setQuery(input)
      }
    },
    [setQuery, input]
  )

  const onSearch = useCallback(
    (query: string) => {
      setLoading(true)
      fetch(`${API_BASE}/autocomplete?query=${query}`)
        .then(resp => resp.json())
        .then((json: ApiResponse<AutocompleteJson>) => {
          setLoading(false)
          setOptions(json.suggestions)
        })
    },
    [setLoading, setOptions]
  )

  const renderMenuItemChildren = useCallback(
    (result: AutocompleteItemJson, props) => (
      <span>
        <b>{result.type}</b>:&nbsp;
        <Highlighter search={props.text || ''}>{result.result}</Highlighter>
      </span>
    ),
    []
  )

  useEffect(() => {
    setInput(query)
    if (typeahead) {
      const instance = typeahead.getInstance()
      instance.setState({ text: query })
      if (query === '') instance.clear()
    }
  }, [query, typeahead])

  return (
    <Form onSubmit={onSubmit}>
      <InputGroup>
        <AsyncTypeahead
          id="search"
          labelKey="result"
          filterBy={['result']}
          renderMenuItemChildren={renderMenuItemChildren}
          onInputChange={setInput}
          onChange={onChange}
          onKeyDown={onKeyDown}
          isLoading={loading}
          onSearch={onSearch}
          placeholder="Search"
          options={options}
          defaultInputValue={input}
          highlightOnlyResult={false}
          minLength={1}
          selectHintOnEnter={false}
          caseSensitive={false}
          ref={typeahead => setTypeahead(typeahead)}
        />
        <InputGroupAddon addonType="append">
          <Button>Search</Button>
        </InputGroupAddon>
      </InputGroup>
    </Form>
  )
}

const ShowAdminToggle: FunctionComponent = () => {
  const { showAdmin, setShowAdmin } = useAuthContext()

  return (
    <Row>
      <Col>
        <Form>
          <FormGroup check>
            <Label check>
              <Input
                type="checkbox"
                checked={showAdmin}
                onChange={event => setShowAdmin(event.currentTarget.checked)}
              />{' '}
              Enable admin-only functionality
            </Label>
          </FormGroup>
        </Form>
        <hr />
      </Col>
    </Row>
  )
}

interface LoadFavesFieldProps {
  queryParam: SongsQuery
}

const LoadFavesField: FunctionComponent<LoadFavesFieldProps> = ({
  queryParam
}) => {
  const history = useHistory()
  const { username } = useAuthContext()
  const [userInput, setUserInput] = useState<string>(queryParam.user || '')

  const handleFaves = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const url = getApiUrl(
        { ...queryParam, user: userInput || username || undefined },
        true
      )
      history.push(url)
    },
    [queryParam, userInput, history]
  )

  return (
    <Form onSubmit={handleFaves}>
      <InputGroup>
        <Input
          placeholder="Username"
          value={userInput || undefined}
          onChange={event => {
            setUserInput(event.currentTarget.value)
          }}
        />
        <InputGroupAddon addonType="append">
          <Button>Load Faves</Button>
        </InputGroupAddon>
      </InputGroup>
    </Form>
  )
}

export interface SongsProps {
  favourites: boolean
}

interface PaginationState {
  per_page: number
  page: number
  pages: number
  total_count: number
}

const placeholders = [...Array(25).fill(null)]

const Songs: FunctionComponent<SongsProps> = ({ favourites }) => {
  const { canUpload } = useSettingsContext()
  const { username, isAdmin, showAdmin } = useAuthContext()

  // request related state
  const [paginationState, setPaginationState] = useState<PaginationState>({
    per_page: 25,
    page: 1,
    pages: 1,
    total_count: 0
  })
  const [songs, setSongs] = useState<SongItem[]>(placeholders)
  const [loading, setLoading] = useDelayedLoader(false)
  const [error, setError] = useState<Description | undefined>(undefined)

  // user controlled state
  const [queryParam, setQueryParam] = useQueryParams({
    query: StringParam,
    page: NumberParam,
    user: StringParam
  })
  const { query = undefined, page = 1, user = undefined } = queryParam

  const updateSong = useCallback(
    (id: string, song: SongItem | null) => {
      let songsCopy = [...songs]
      const stateSong: number = songsCopy.findIndex(
        element => element.id === id
      )
      if (stateSong > -1) {
        console.log('updating:', { id, song })
        if (song !== null) {
          songsCopy[stateSong] = { ...songsCopy[stateSong], ...song }
        } else {
          // remove song if null
          songsCopy = songsCopy.filter(item => item !== songs[stateSong])
        }
        setSongs(songsCopy)
      }
    },
    [songs]
  )

  const refreshSong = useCallback(
    (song: string): void => {
      fetch(`${API_BASE}/song/${song}`, { method: 'GET' })
        .then(res => res.json())
        .then((result: ApiResponse<SongItem>) => {
          // update existing song if it exists
          updateSong(song, result)
          setSongs([result, ...songs])
        })
    },
    [songs]
  )

  const pagination = (
    <Pagination
      activePage={page || 1}
      itemsCountPerPage={paginationState.per_page}
      totalItemsCount={paginationState.total_count}
      pageRangeDisplayed={paginationState.total_count}
      onChange={pageNumber => {
        setQueryParam({ page: pageNumber }, 'push')
      }}
      itemClass="page-item"
      linkClass="page-link"
      prevPageText="«"
      firstPageText="First"
      lastPageText="Last"
      nextPageText="»"
      innerClass="pagination justify-content-center"
    />
  )

  const loadSongs = useCallback(() => {
    setLoading(true)
    fetch(API_BASE + getApiUrl({ page, user, query }, favourites), {
      method: 'GET'
    })
      .then(res => {
        setLoading(false)
        return res.clone().json()
      })
      .then((result?: ApiResponse<SongsJson>) => {
        if (result === undefined) {
          return Promise.reject({
            description: 'Error occured while loading response'
          })
        }
        return result.error !== null
          ? Promise.reject(result)
          : Promise.resolve(result)
      })
      .then(result => {
        setSongs(result.songs)
        setPaginationState(result.pagination)
      })
      .catch((result: ApiBaseResponse) => {
        if (result) {
          const msg = 'description' in result ? result.description : null
          if (msg) setError(msg)
        }
      })
  }, [page, user, query, favourites])

  // update request url on query change
  useEffect(() => {
    loadSongs()
  }, [page, user, query, favourites, username])

  const fadeProps = useSpring({
    opacity: loading ? 0.75 : 1
  })

  if (error && error !== '') {
    return <Error large error={error} errorInfo={{}} />
  }

  return (
    <Container className={cx(containerWidthStyle, navbarMarginStyle)}>
      {isAdmin && <ShowAdminToggle />}
      {(canUpload || (isAdmin && showAdmin)) && (
        <Row>
          <Col>
            <SongUploadForm refreshSong={refreshSong} />
            <hr />
          </Col>
        </Row>
      )}
      <Row>
        <Col xs={12} md={6}>
          <LoadFavesField queryParam={queryParam} />
        </Col>
        <Col xs={12} md={6} className="mt-2 mt-md-0">
          <SearchField
            query={query}
            setQuery={(query: string) => setQueryParam({ query })}
          />
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
        <Col
          style={{
            minHeight: '16rem'
          }}>
          <animated.div className="d-flex h-100" style={fadeProps}>
            {!loading && songs.length === 0 && (
              <h2 className="mx-auto text-center align-self-center">
                No results
              </h2>
            )}
            {songs.length !== 0 && (
              <SongsTable
                songs={loading ? placeholders : songs}
                updateSong={updateSong}
              />
            )}
          </animated.div>
        </Col>
      </Row>
      <Row>
        <Col>
          <hr />
          <div className="justify-content-center">{pagination}</div>
          <hr />
        </Col>
      </Row>
    </Container>
  )
}

export default Songs
