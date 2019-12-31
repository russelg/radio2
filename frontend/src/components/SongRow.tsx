import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, {
  FunctionComponent,
  Suspense,
  useCallback,
  useState
} from 'react'
import { view } from 'react-easy-state'
import { toast } from 'react-toastify'
import { Button, Form, UncontrolledTooltip } from 'reactstrap'
import { useMutate } from 'restful-react'
import Editable from '/../lib/react-bootstrap-editable/src/Editable'
import { SongItem, SongMeta, ApiBaseResponse, ApiResponse } from '/api/Schemas'
import LoaderSpinner from '/components/LoaderSpinner'
import { API_BASE, auth, settings } from '/store'
import { readableFilesize } from '/utils'
import { useFetch } from '/api'

interface SongRowProps {
  song: SongItem
  updateSong: (id: string, song: SongItem) => void
}

const RequestButton: FunctionComponent<SongRowProps> = ({
  song,
  updateSong
}) => {
  const { mutate: request, loading: loading } = useMutate({
    verb: 'PUT',
    path: `/request`,
    base: API_BASE,
    onMutate: (body, data) => {
      toast(data.description, {
        type: 'success'
      })
      updateSong(song.id, { ...song, meta: data.meta })
    }
  })

  const requestSong = (id: string) => {
    request({ id }).catch(err => {
      err &&
        err.data &&
        err.data.description &&
        toast(err.data.description, {
          type: 'error'
        })
    })
  }

  return (
    <>
      <div className="disabled-button-wrapper" id={`request-${song.id}`}>
        <Button
          disabled={!song.meta.requestable}
          color={!song.meta.requestable ? 'danger' : undefined}
          onClick={() => requestSong(song.id)}>
          {loading ? <LoaderSpinner size="sm" /> : 'Request'}
        </Button>
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
  const [loading, setLoading] = useState(false)

  const favouriteSong = useCallback(() => {
    if (loading) return
    setLoading(true)

    fetch(`${API_BASE}/favourites`, {
      method: song.meta.favourited ? 'DELETE' : 'PUT',
      body: JSON.stringify({ id: song.id }),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    })
      .then(res => res.json())
      .then((result: ApiBaseResponse) => {
        setLoading(false)
        const error = result.error !== null
        const msg = result.description || ''
        if (typeof msg === 'string') {
          toast(msg, {
            type: error ? 'error' : 'success'
          })
        }

        if (!error) {
          const { meta } = song
          meta.favourited = !meta.favourited
          updateSong(song.id, { ...song, meta })
        }
      })
      .catch(err => {
        toast(err.message, { type: 'error' })
      })
  }, [song])

  return (
    <Button
      className="px-2"
      id={`favourite-${song.id}`}
      color={song.meta.favourited ? 'danger' : undefined}
      onClick={favouriteSong}>
      <FontAwesomeIcon
        fixedWidth
        icon={song.meta.favourited ? faBan : faHeart}
      />
      <UncontrolledTooltip
        placement="top"
        target={`favourite-${song.id}`}
        delay={0}>
        {song.meta.favourited ? 'Unfavourite' : 'Favourite'}
      </UncontrolledTooltip>
    </Button>
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
