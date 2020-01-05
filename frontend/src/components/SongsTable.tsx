import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { lazy, Suspense, FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Button, Form, Table, UncontrolledTooltip } from 'reactstrap'
import { SongItem } from '/api/Schemas'
import { readableFilesize } from '/utils'
import LoaderSpinner from '/components/LoaderSpinner'
import SongRow from '/components/SongRow'

// @ts-ignore
const Editable = lazy(() =>
  import('/../lib/react-bootstrap-editable/src/Editable')
)

interface Props {
  songs: SongItem[]
  updateSong: (id: string, song: SongItem | null) => void
  showAdmin: boolean
}

interface State {
  deleting: SongItem[]
}

const SongsTable: FunctionComponent<Props> = ({
  songs,
  updateSong,
  showAdmin
}) => {
  return (
    <Table striped>
      <thead>
        <tr className="d-flex">
          <th className="col-3">Artist</th>
          <th className="col-5">Title</th>
          <th className="col" />
        </tr>
      </thead>
      <tbody>
        {songs.map((song: SongItem) => (
          <SongRow
            key={song.id}
            song={song}
            updateSong={updateSong}
            showAdmin={showAdmin}
          />
        ))}
      </tbody>
    </Table>
  )
}

export default view(SongsTable)
