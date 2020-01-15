import React, { FunctionComponent, lazy } from 'react'
import { Table } from 'reactstrap'
import { SongItem } from '/api/Schemas'
import SongRow from '/components/SongRow'
import { useAuthState } from '/contexts/auth'

// @ts-ignore
const Editable = lazy(() =>
  import('/../lib/react-bootstrap-editable/src/Editable')
)

interface Props {
  songs: (SongItem | null)[]
  updateSong: (id: string, song: SongItem | null) => void
  showAdmin: boolean
}

const SongsTable: FunctionComponent<Props> = ({
  songs,
  updateSong,
  showAdmin
}) => {
  const { admin: isAdmin, loggedIn } = useAuthState()
  const admin = isAdmin && showAdmin

  return (
    <Table striped>
      <thead>
        <tr className="d-flex">
          <th className="col-1">Length</th>
          <th className={admin ? 'col-2' : 'col-3'}>Artist</th>
          <th className="col">Title</th>
          <th className="col-auto" />
        </tr>
      </thead>
      <tbody>
        {songs.map((song: SongItem | null, idx) => (
          <SongRow
            key={song ? song.id : idx}
            song={song}
            updateSong={updateSong}
            showAdmin={showAdmin}
          />
        ))}
      </tbody>
    </Table>
  )
}

export default SongsTable
