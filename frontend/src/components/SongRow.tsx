import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { css, cx } from 'emotion'
import React, { FormEvent, FunctionComponent, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Form, UncontrolledTooltip } from 'reactstrap'
import Editable from '/../lib/react-bootstrap-editable/src/Editable'
import { API_BASE, handleResponse, useFetch } from '/api'
import {
  ApiBaseResponse,
  ApiResponse,
  SongDownloadJson,
  SongItem
} from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import LoaderSkeleton from '/components/LoaderSkeleton'
import NotificationToast from '/components/NotificationToast'
import { useAuthState } from '/contexts/auth'
import { useSiteSettingsState } from '/contexts/settings'
import { readableFilesize, readableSeconds } from '/utils'

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

const handleError = <T extends ApiBaseResponse>(result: T) => {
  if (result) {
    const msg = 'description' in result ? result.description : result.message
    if (msg)
      toast(
        <NotificationToast error>
          <ul>
            {msg === Object(msg) ? (
              Object.values(msg).map((err) => <li key={err}>{err}</li>)
            ) : (
              <li>msg</li>
            )}
          </ul>
        </NotificationToast>
      )
  }
}

const RequestButton: FunctionComponent<SongRowUpdateProps> = ({
  song,
  updateSong
}) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/request`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const requestSong = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault()
    run({
      method: 'PUT',
      body: JSON.stringify({ id: song.id })
    })
      .then(handleResponse)
      .then((resp: ApiResponse<SongItem>) => {
        updateSong(song.id, { ...song, meta: resp.meta })
      })
      .catch(handleError)
  }

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

type FavouriteButtonProps = {
  useIcon?: boolean
}

export const FavouriteButton: FunctionComponent<
  SongRowUpdateProps & FavouriteButtonProps
> = ({ song, updateSong, useIcon = true }) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/favourites`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const favouriteSong = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault()
    run({
      method: song.meta.favourited ? 'DELETE' : 'PUT',
      body: JSON.stringify({ id: song.id })
    })
      .then(handleResponse)
      .then((resp: ApiBaseResponse) => {
        const { meta } = song
        meta.favourited = !meta.favourited
        updateSong(song.id, { ...song, meta })
      })
      .catch(handleError)
  }

  const tooltipText = song.meta.favourited
    ? loading
      ? 'Unfavouriting...'
      : 'Remove song from favourites'
    : loading
    ? 'Favouriting...'
    : 'Add song to favourites'

  return (
    <>
      <div ref={tooltipRef} className="mt-1">
        <LoaderButton
          loading={loading}
          color={song.meta.favourited ? 'danger' : undefined}
          onClick={favouriteSong}>
          {useIcon ? (
            <FontAwesomeIcon
              fixedWidth
              icon={song.meta.favourited ? faBan : faHeart}
            />
          ) : (
            tooltipText
          )}
        </LoaderButton>
      </div>
      {useIcon && (
        <UncontrolledTooltip
          placement="top"
          // @ts-ignore
          target={tooltipRef}
          delay={0}>
          {tooltipText}
        </UncontrolledTooltip>
      )}
    </>
  )
}

const DownloadButton: FunctionComponent<SongRowButtonProps> = ({ song }) => {
  const { data, loading, errors, run } = useFetch(`${API_BASE}/auth/download`)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const downloadSong = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault()
    run({
      method: 'POST',
      body: JSON.stringify({ id: song.id })
    })
      .then((resp: ApiResponse<SongDownloadJson>) => {
        if ('download_token' in resp) {
          const token = resp.download_token
          const link = document.createElement('a')
          document.body.appendChild(link)
          link.href = `${API_BASE}/download?token=${token}`
          link.setAttribute('type', 'hidden')
          link.click()
          document.body.removeChild(link)
        } else {
          throw resp
        }
      })
      .catch(handleError)
  }

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
  const deleteSong = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (confirming) {
      run({ method: 'DELETE' })
        .then(handleResponse)
        .then((resp: ApiBaseResponse) => {
          updateSong(song.id, null)
          setConfirming(false)
        })
        .catch((reason) => {
          handleError(reason)
          setConfirming(false)
        })
    } else {
      setConfirming(true)
    }
  }

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
          <div ref={cancelTooltipRef} className="mt-1">
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
  const editSongMetadata = (newValue: string) => {
    if (newValue === song[field]) return
    run({
      method: 'PUT',
      body: JSON.stringify({ [field]: newValue })
    })
      .then(handleResponse)
      .then((resp: ApiResponse<SongItem>) =>
        updateSong(song.id, { ...song, ...resp })
      )
      .catch(handleError)
  }

  return (
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
  )
}

interface SongRowProps {
  song: SongItem | null
  updateSong: UpdateSong
  showAdmin: boolean
}

function getRandomArbitrary(min: number, max: number): string {
  return `${Math.random() * (max - min) + min}%`
}

const SongRow: FunctionComponent<SongRowProps> = ({
  song,
  updateSong,
  showAdmin
}) => {
  const { canDownload } = useSiteSettingsState()
  const { admin: isAdmin, loggedIn } = useAuthState()
  const admin = isAdmin && showAdmin

  const artistWidth = useState(getRandomArbitrary(20, 80))[0]
  const titleWidth = useState(getRandomArbitrary(20, 80))[0]

  return (
    <tr className="d-flex">
      <td className="col-1 text-muted">
        <LoaderSkeleton loading={song === null}>
          {() => readableSeconds(song!.length)}
        </LoaderSkeleton>
      </td>
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
      <td className="col">
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
      <td className="col-auto text-right d-flex align-items-center justify-content-end">
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
