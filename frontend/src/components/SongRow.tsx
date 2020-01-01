import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, {
  FunctionComponent,
  Suspense,
  useCallback,
  FormEvent
} from 'react'
import { view } from 'react-easy-state'
import { toast } from 'react-toastify'
import { Button, Form, Spinner, UncontrolledTooltip } from 'reactstrap'
import Editable from '/../lib/react-bootstrap-editable/src/Editable'
import { useFetch } from '/api'
import { ApiBaseResponse, ApiResponse, SongItem } from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import LoaderSpinner from '/components/LoaderSpinner'
import { API_BASE, auth, settings } from '/store'
import { readableFilesize } from '/utils'

interface SongRowProps {
  song: SongItem
  updateSong: (id: string, song: SongItem) => void
}

const handleResponse = <T extends ApiBaseResponse>(result: T): Promise<T> => {
  if (result === undefined) {
    return Promise.reject({
      description: 'Error occured while loading response'
    })
  }

  const error = result.error !== null
  const msg = result.description || ''
  if (typeof msg === 'string' && !error) {
    toast(msg, {
      type: 'success'
    })
  }

  return error ? Promise.reject(result) : Promise.resolve(result)
}

const toastError = <T extends ApiBaseResponse>(result: T) => {
  if (result) {
    const msg = 'description' in result ? result.description : result.message
    if (msg) toast(msg, { type: 'error' })
  }
}

const RequestButton: FunctionComponent<SongRowProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/request`)

  const requestSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.blur()

      run({
        method: 'PUT',
        body: JSON.stringify({ id: song.id })
      })
        .then(handleResponse)
        .then((result: ApiResponse<SongItem>) => {
          updateSong(song.id, { ...song, meta: result.meta })
        })
        .catch(toastError)
    },
    [song]
  )

  return (
    <>
      <div className="disabled-button-wrapper" id={`request-${song.id}`}>
        <LoaderButton
          loading={loading}
          disabled={!song.meta.requestable}
          color={!song.meta.requestable ? 'danger' : undefined}
          onClick={requestSong}>
          Request
        </LoaderButton>
      </div>
      <UncontrolledTooltip
        placement="top"
        target={`request-${song.id}`}
        delay={0}>
        {song.meta.requestable
          ? `Last played: ${song.meta.humanized_lastplayed}`
          : song.meta.reason}
      </UncontrolledTooltip>
    </>
  )
}

const FavouriteButton: FunctionComponent<SongRowProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/favourites`)

  const favouriteSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.blur()

      run({
        method: song.meta.favourited ? 'DELETE' : 'PUT',
        body: JSON.stringify({ id: song.id })
      })
        .then(handleResponse)
        .then((result: ApiBaseResponse) => {
          const { meta } = song
          meta.favourited = !meta.favourited
          updateSong(song.id, { ...song, meta })
        })
        .catch(toastError)
    },
    [song]
  )

  return (
    <>
      <LoaderButton
        loading={loading}
        id={`favourite-${song.id}`}
        color={song.meta.favourited ? 'danger' : undefined}
        onClick={favouriteSong}>
        <FontAwesomeIcon
          fixedWidth
          icon={song.meta.favourited ? faBan : faHeart}
        />
      </LoaderButton>
      <UncontrolledTooltip
        placement="top"
        target={`favourite-${song.id}`}
        delay={0}>
        {song.meta.favourited ? 'Unfavourite' : 'Favourite'}
      </UncontrolledTooltip>
    </>
  )
}

const SongRow: FunctionComponent<SongRowProps> = ({ song, updateSong }) => {
  return (
    <tr key={song.id} className="d-flex">
      <td className="col-3">
        {auth.admin ? (
          <Suspense fallback={<LoaderSpinner />}>
            <Editable
              name="artist"
              dataType="textfield"
              mode="inline"
              isValueClickable
              initialValue={song.artist}
              // onSubmit={(value: string) =>
              //   this.props.updateSongMetadata(song, {
              //     artist: value
              //   })
              // }
            />
          </Suspense>
        ) : (
          song.artist
        )}
      </td>
      <td className="col-5">
        {auth.admin ? (
          <Suspense fallback={<LoaderSpinner />}>
            <Editable
              name="title"
              type="textfield"
              mode="inline"
              isValueClickable
              initialValue={song.title}
              // onSubmit={(value: string) =>
              //   this.props.updateSongMetadata(song, {
              //     title: value
              //   })
              // }
            />
          </Suspense>
        ) : (
          song.title
        )}
      </td>
      <td className="col text-right">
        <Form inline className="justify-content-end">
          <RequestButton song={song} updateSong={updateSong} />
          &nbsp;
          {auth.logged_in && (
            <FavouriteButton song={song} updateSong={updateSong} />
          )}
          &nbsp;
          {settings.downloads_enabled && (
            <Button
              className="px-2"
              // onClick={() => this.props.downloadSong(song)}
              id={`download-${song.id}`}>
              <FontAwesomeIcon fixedWidth icon={faDownload} />
              <UncontrolledTooltip
                placement="top"
                target={`download-${song.id}`}
                delay={0}>
                {readableFilesize(song.size)}
              </UncontrolledTooltip>
            </Button>
          )}
          &nbsp;
          {auth.admin && (
            <Button
              className="px-2"
              id={`delete-${song.id}`}
              // color={this.state.deleting.includes(song) ? 'danger' : 'warning'}
              // onClick={() => {
              //   this.state.deleting.includes(song)
              //     ? this.props.deleteSong(song)
              //     : this.setState({
              //         deleting: [song, ...this.state.deleting]
              //       })
              // }}
            >
              <FontAwesomeIcon
                fixedWidth
                icon={
                  // this.state.deleting.includes(song)
                  //   ? faExclamationTriangle
                  //   :
                  faTrash
                }
              />
              <UncontrolledTooltip
                placement="top"
                target={`delete-${song.id}`}
                delay={0}>
                {
                  // this.state.deleting.includes(song)
                  // ? 'Press again to delete permanently'
                  // :
                  'Delete'
                }
              </UncontrolledTooltip>
            </Button>
          )}
          &nbsp;
        </Form>
      </td>
    </tr>
  )
}

export default view(SongRow)
