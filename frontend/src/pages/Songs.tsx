import { API_BASE, handleResponse } from '/api'
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
import NotificationToast from '/components/NotificationToast'
import SongsTable from '/components/SongsTable'
import { useAuthState } from '/contexts/auth'
import { useSiteSettingsState } from '/contexts/settings'
import {
  containerWidthStyle,
  navbarMarginStyle,
  useDelayedLoader,
  useLocalStorage
} from '/utils'
import { cx } from 'emotion'
// @ts-ignore
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import 'filepond/dist/filepond.min.css'
import { stringify } from 'query-string'
import React, {
  FormEvent,
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  AsyncTypeahead,
  Highlighter,
  TypeaheadMenuProps
} from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import { File as FilePondFile, FilePond, registerPlugin } from 'react-filepond'
import Pagination from 'react-js-pagination'
import { useHistory } from 'react-router-dom'
import { animated, useSpring } from 'react-spring'
import { toast } from 'react-toastify'
import {
  Button,
  Col,
  Collapse,
  Container,
  Form,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
  Label,
  Row
} from 'reactstrap'
import { NumberParam, StringParam, useQueryParams } from 'use-query-params'
// @ts-ignore

registerPlugin(FilePondPluginFileValidateType)

interface SongUploadFormProps {
  refreshSong: (song: string) => void
}

const SongUploadForm: FunctionComponent<SongUploadFormProps> = ({
  refreshSong
}) => {
  const { accessToken } = useAuthState()

  const pond = useRef<FilePond>(null)
  const [files, setFiles] = useState<FilePondFile[]>([])

  const server = {
    process: {
      url: `${API_BASE}/upload`,
      onload: (response: string) => {
        const json: { id: string } = JSON.parse(response)
        return json.id
      },
      onerror: (response: string) => {
        const json: ApiBaseResponse = JSON.parse(response)
        toast(<NotificationToast error>{json.description}</NotificationToast>)
      },
      headers: {
        Authorization:
          accessToken !== null ? `Bearer ${accessToken}` : undefined
      }
    }
  }

  const onUpdateFiles = (fileItems: FilePondFile[]) => {
    setFiles(fileItems)
  }

  const onProcessFile = (err: any, file: FilePondFile) => {
    if (!err) {
      // @ts-ignore
      toast(<NotificationToast>Song uploaded!</NotificationToast>)
      refreshSong(file.serverId)

      // remove file after uploaded
      pond.current && pond.current.removeFile(file.id)
      setFiles(files => files.filter(itm => itm.file !== file.file))
    }
  }

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
      onupdatefiles={onUpdateFiles}
      onprocessfile={onProcessFile}
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
  if (!params.query) delete params.query
  if (!params.user) delete params.user

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

  const ref = useRef()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setQuery(input)
  }

  const onChange = (selected: AutocompleteItemJson[]) => {
    const res: AutocompleteItemJson = selected[0] || {
      result: ''
    }
    setInput(res.result)
  }
  const onKeyDown = (event: any) => {
    // only submit on enter if the user has not selected a typeahead option
    if (event.keyCode === 13 && input === event.target.defaultValue) {
      event.preventDefault()
      setQuery(input)
    }
  }

  const onSearch = (query: string) => {
    setLoading(true)
    fetch(`${API_BASE}/autocomplete?query=${query}`)
      .then(resp => resp.clone().json())
      .then((json: ApiResponse<AutocompleteJson>) => {
        setOptions(json.suggestions)
        setLoading(false)
      })
  }

  const renderMenuItemChildren = (
    result: AutocompleteItemJson,
    props: TypeaheadMenuProps<AutocompleteItemJson>
  ) => (
    <span>
      <b>{result.type}</b>:&nbsp;
      <Highlighter search={props.text || ''}>{result.result}</Highlighter>
    </span>
  )

  useEffect(() => {
    setInput(query)
  }, [query])

  return (
    <Form onSubmit={onSubmit}>
      <InputGroup>
        <AsyncTypeahead
          id="search"
          labelKey="result"
          // filterBy={['result']}
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
          minLength={2}
          maxResults={10}
          caseSensitive={false}
          // @ts-ignore
          ref={ref}
        />
        <InputGroupAddon addonType="append">
          <Button>Search</Button>
        </InputGroupAddon>
      </InputGroup>
    </Form>
  )
}

type ShowAdminToggleProps = {
  showAdmin: boolean
  setShowAdmin: (value: boolean) => void
}

const ShowAdminToggle: FunctionComponent<ShowAdminToggleProps> = ({
  showAdmin,
  setShowAdmin
}) => {
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
  const { username } = useAuthState()
  const [userInput, setUserInput] = useState<string>(queryParam.user || '')

  const handleFaves = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const url = getApiUrl(
      { ...queryParam, user: userInput || username || undefined },
      true
    )
    history.push(url)
  }

  return (
    <Form onSubmit={handleFaves}>
      <InputGroup>
        <Input
          placeholder="Username"
          value={userInput || ''}
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
  const [showAdmin, setShowAdmin] = useLocalStorage<boolean>(
    'show_admin',
    false
  )
  const { canUpload } = useSiteSettingsState()
  const { admin } = useAuthState()

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

  const PlaceholderTable = useMemo(
    () => (
      <SongsTable
        songs={placeholders}
        updateSong={() => {}}
        showAdmin={showAdmin}
      />
    ),
    [showAdmin]
  )

  const updateSong = (id: string, song: SongItem | null): boolean => {
    let songsCopy = [...songs]
    const stateSong: number = songsCopy.findIndex(element => element.id === id)
    if (stateSong > -1) {
      if (song !== null) {
        songsCopy[stateSong] = { ...songsCopy[stateSong], ...song }
      } else {
        // remove song if null
        songsCopy = songsCopy.filter(item => item !== songs[stateSong])
      }
      setSongs(songsCopy)
      return true
    }
    return false
  }

  const refreshSong = (song: string): void => {
    fetch(`${API_BASE}/song/${song}`, { method: 'GET' })
      .then(res => res.clone().json())
      .then((result: ApiResponse<SongItem>) => {
        // update existing song if it exists
        const updated = updateSong(song, result)
        if (!updated) setSongs([result, ...songs])
      })
  }

  const pagination = (
    <Pagination
      activePage={page || 1}
      itemsCountPerPage={paginationState.per_page}
      totalItemsCount={paginationState.total_count}
      pageRangeDisplayed={paginationState.total_count}
      onChange={pageNumber => {
        setQueryParam({ query, user, page: pageNumber }, 'push')
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

  const loadSongs = () => {
    setLoading(true)
    fetch(API_BASE + getApiUrl({ page, user, query }, favourites), {
      method: 'GET'
    })
      .then(resp => {
        setLoading(false)
        return resp.clone().json()
      })
      .then(resp => handleResponse(resp, false))
      .then((resp: ApiResponse<SongsJson>) => {
        setSongs(resp.songs)
        setPaginationState(resp.pagination)
      })
      .catch((resp: ApiBaseResponse) => {
        if (resp) {
          const msg = resp.description || ''
          if (msg) setError(msg)
        }
      })
  }

  // update request url on query change
  useEffect(() => {
    // don't load page if favourites is set but user is not there, or vice versa
    if (favourites ? user !== undefined : user === undefined) {
      loadSongs()
    }
  }, [page, user, query, favourites])

  const fadeProps = useSpring({
    opacity: loading ? 0.75 : 1
  })

  if (error && error !== '') {
    return <Error large error={error} errorInfo={{}} />
  }

  return (
    <Container className={cx(containerWidthStyle, navbarMarginStyle)}>
      {admin && (
        <ShowAdminToggle showAdmin={showAdmin} setShowAdmin={setShowAdmin} />
      )}
      <Collapse isOpen={canUpload || (admin && showAdmin)}>
        {(canUpload || (admin && showAdmin)) && (
          <Row>
            <Col>
              <SongUploadForm refreshSong={refreshSong} />
              <hr />
            </Col>
          </Row>
        )}
      </Collapse>
      <Row>
        <Col xs={12} md={6}>
          <LoadFavesField queryParam={queryParam} />
        </Col>
        <Col xs={12} md={6} className="mt-2 mt-md-0">
          <SearchField
            query={query || ''}
            setQuery={(query: string) =>
              setQueryParam({ query: query || undefined, page: 1 })
            }
          />
        </Col>
      </Row>
      <Row>
        <Col className="justify-content-center">
          <hr />
          {pagination}
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
            {songs.length !== 0 &&
              (loading ? (
                PlaceholderTable
              ) : (
                <SongsTable
                  songs={songs}
                  updateSong={updateSong}
                  showAdmin={showAdmin}
                />
              ))}
          </animated.div>
        </Col>
      </Row>
      <Row>
        <Col>
          <hr className="mt-0" />
          <div className="justify-content-center">{pagination}</div>
          <hr />
        </Col>
      </Row>
    </Container>
  )
}

export default Songs
