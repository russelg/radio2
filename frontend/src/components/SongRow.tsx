import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { css, cx } from 'emotion'
import React, {
  FormEvent,
  FunctionComponent,
  Suspense,
  useCallback,
  useRef,
  useState,
  useEffect
} from 'react'
import { toast } from 'react-toastify'
import { Button, Form, UncontrolledTooltip } from 'reactstrap'
import NotificationToast from './NotificationToast'
import Editable from '/../lib/react-bootstrap-editable/src/Editable'
import { useFetch } from '/api'
import {
  ApiBaseResponse,
  ApiResponse,
  SongDownloadJson,
  SongItem
} from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import LoaderSkeleton from '/components/LoaderSkeleton'
import LoaderSpinner from '/components/LoaderSpinner'
import { useAuthContext } from '/contexts/auth'
import { useSettingsContext } from '/contexts/settings'
import { API_BASE } from '/store'
import { readableFilesize } from '/utils'

const disabledButtonStyle = css`
  display: inline-block;
  cursor: not-allowed;

  .btn[disabled] {
    pointer-events: none;
  }
`

interface SongRowButtonProps {
  song: SongItem
}

type UpdateSong = (id: string, song: SongItem | null) => void

interface SongRowUpdateProps extends SongRowButtonProps {
  updateSong: UpdateSong
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
    toast(<NotificationToast>{msg}</NotificationToast>)
  }

  return error ? Promise.reject(result) : Promise.resolve(result)
}

const handleError = <T extends ApiBaseResponse>(result: T) => {
  if (result) {
    const msg = 'description' in result ? result.description : result.message
    if (msg) toast(<NotificationToast error>{msg}</NotificationToast>)
  }
}

const RequestButton: FunctionComponent<SongRowUpdateProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/request`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const requestSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
      run({
        method: 'PUT',
        body: JSON.stringify({ id: song.id })
      })
        .then(handleResponse)
        .then((result: ApiResponse<SongItem>) => {
          updateSong(song.id, { ...song, meta: result.meta })
        })
        .catch(handleError)
    },
    [song]
  )

  return (
    <>
      <div className={cx(disabledButtonStyle, 'mt-1')} ref={tooltipRef}>
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
        // @ts-ignore
        target={tooltipRef}
        delay={0}>
        {song.meta.requestable
          ? loading
            ? 'Requesting...'
            : `Last played: ${song.meta.humanized_lastplayed}`
          : song.meta.reason}
      </UncontrolledTooltip>
    </>
  )
}

const FavouriteButton: FunctionComponent<SongRowUpdateProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/favourites`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const favouriteSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
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
        .catch(handleError)
    },
    [song]
  )

  return (
    <>
      <div ref={tooltipRef} className="mt-1">
        <LoaderButton
          loading={loading}
          color={song.meta.favourited ? 'danger' : undefined}
          onClick={favouriteSong}>
          <FontAwesomeIcon
            fixedWidth
            icon={song.meta.favourited ? faBan : faHeart}
          />
        </LoaderButton>
      </div>
      <UncontrolledTooltip
        placement="top"
        // @ts-ignore
        target={tooltipRef}
        delay={0}>
        {song.meta.favourited
          ? loading
            ? 'Unfavouriting...'
            : 'Unfavourite'
          : loading
          ? 'Favouriting...'
          : 'Favourite'}
      </UncontrolledTooltip>
    </>
  )
}

const DownloadButton: FunctionComponent<SongRowButtonProps> = ({ song }) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/auth/download`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const downloadSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
      run({
        method: 'POST',
        body: JSON.stringify({ id: song.id })
      })
        .then((result: ApiResponse<SongDownloadJson>) => {
          if ('download_token' in result) {
            const token = result.download_token
            const link = document.createElement('a')
            document.body.appendChild(link)
            link.href = `${API_BASE}/download?token=${token}`
            link.setAttribute('type', 'hidden')
            link.click()
            document.body.removeChild(link)
          } else {
            throw result
          }
        })
        .catch(handleError)
    },
    [song]
  )

  return (
    <>
      <div ref={tooltipRef} className="mt-1">
        <LoaderButton loading={loading} onClick={downloadSong}>
          <FontAwesomeIcon fixedWidth icon={faDownload} />
        </LoaderButton>
      </div>
      <UncontrolledTooltip
        placement="top"
        // @ts-ignore
        target={tooltipRef}
        delay={0}>
        {loading ? 'Downloading...' : readableFilesize(song.size)}
      </UncontrolledTooltip>
    </>
  )
}

const DeleteButton: FunctionComponent<SongRowUpdateProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/song/${song.id}`)
  const [confirming, setConfirming] = useState<boolean>(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const cancelTooltipRef = useRef<HTMLDivElement>(null)
  const deleteSong = useCallback(
    (event: FormEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (confirming) {
        console.log('delete would fire here :))')
        run({ method: 'DELETE' })
          .then(handleResponse)
          .then((result: ApiBaseResponse) => {
            updateSong(song.id, null)
            setConfirming(false)
          })
          .catch(reason => {
            handleError(reason)
            setConfirming(false)
          })
      } else {
        setConfirming(true)
      }
    },
    [confirming, song]
  )

  const cancelDeleting = () => {
    setConfirming(false)
  }

  return (
    <>
      <div ref={tooltipRef} className="mt-1">
        <LoaderButton
          color={confirming ? 'danger' : 'warning'}
          loading={loading}
          onClick={deleteSong}>
          <FontAwesomeIcon
            fixedWidth
            icon={confirming ? faExclamationTriangle : faTrash}
          />
        </LoaderButton>
      </div>
      {confirming && (
        // show cancel button when confirming delete
        <>
          &nbsp;
          <div ref={cancelTooltipRef}>
            <Button color="primary" onClick={cancelDeleting}>
              <FontAwesomeIcon fixedWidth icon={faTimes} />
            </Button>
          </div>
          <UncontrolledTooltip
            placement="top"
            // @ts-ignore
            target={cancelTooltipRef}
            delay={0}>
            Cancel delete
          </UncontrolledTooltip>
        </>
      )}
      <UncontrolledTooltip
        placement="top"
        // @ts-ignore
        target={tooltipRef}
        delay={0}>
        {confirming
          ? loading
            ? 'Deleting...'
            : 'Press again to delete permanently'
          : 'Delete'}
      </UncontrolledTooltip>
    </>
  )
}

interface EditableValueProps extends SongRowUpdateProps {
  field: 'artist' | 'title'
}

const editableStyle = css`
  > a {
    border-bottom: 1px dashed currentColor;
  }
`

const EditableValue: FunctionComponent<EditableValueProps> = ({
  field,
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/song/${song.id}`)
  const editSongMetadata = useCallback(
    (newValue: string) => {
      if (newValue === song[field]) return
      run({
        method: 'PUT',
        body: JSON.stringify({ [field]: newValue })
      })
        .then(handleResponse)
        .then((result: ApiResponse<SongItem>) => {
          updateSong(song.id, { ...song, ...result })
        })
        .catch(handleError)
    },
    [field, song]
  )

  return (
    <Suspense fallback={<LoaderSpinner />}>
      <Editable
        className={cx(editableStyle, {
          'font-italic font-weight-bold': loading
        })}
        name={field}
        dataType="textfield"
        mode="inline"
        isValueClickable
        initialValue={song[field]}
        onSubmit={editSongMetadata}
      />
    </Suspense>
  )
}

interface SongRowProps {
  song: SongItem | null
  updateSong: UpdateSong
}

function getRandomArbitrary(min: number, max: number): string {
  return `${Math.random() * (max - min) + min}%`
}

const SongRow: FunctionComponent<SongRowProps> = ({ song, updateSong }) => {
  const { canDownload } = useSettingsContext()
  const { isAdmin, loggedIn, showAdmin } = useAuthContext()
  const admin = isAdmin && showAdmin

  const [artistWidth, setArtistWidth] = useState(getRandomArbitrary(20, 80))
  const [titleWidth, setTitleWidth] = useState(getRandomArbitrary(20, 80))

  return (
    <tr className="d-flex">
      <td className="col-3">
        <LoaderSkeleton loading={song === null} width={artistWidth}>
          {() =>
            admin ? (
              <EditableValue
                field="artist"
                song={song!}
                updateSong={updateSong}
              />
            ) : (
              song!.artist
            )
          }
        </LoaderSkeleton>
      </td>
      <td className="col-5">
        <LoaderSkeleton loading={song === null} width={titleWidth}>
          {() =>
            admin ? (
              <EditableValue
                field="title"
                song={song!}
                updateSong={updateSong}
              />
            ) : (
              song!.title
            )
          }
        </LoaderSkeleton>
      </td>
      <td className="col text-right d-flex align-items-center justify-content-end">
        <Form inline className="justify-content-center mt-n1">
          <LoaderSkeleton loading={song === null} width={80} height={36}>
            {() => <RequestButton song={song!} updateSong={updateSong} />}
          </LoaderSkeleton>
          {loggedIn && (
            <>
              &nbsp;
              <LoaderSkeleton loading={song === null} width={50} height={36}>
                {() => <FavouriteButton song={song!} updateSong={updateSong} />}
              </LoaderSkeleton>
            </>
          )}
          {(canDownload || admin) && (
            <>
              &nbsp;
              <LoaderSkeleton loading={song === null} width={50} height={36}>
                {() => <DownloadButton song={song!} />}
              </LoaderSkeleton>
            </>
          )}
          {admin && (
            <>
              &nbsp;
              <LoaderSkeleton loading={song === null} width={50} height={36}>
                {() => <DeleteButton song={song!} updateSong={updateSong} />}
              </LoaderSkeleton>
            </>
          )}
        </Form>
      </td>
    </tr>
  )
}

export default SongRow
