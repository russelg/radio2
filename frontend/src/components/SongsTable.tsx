import React, { FunctionComponent, lazy } from 'react'
import { Table } from 'reactstrap'
import { SongItem } from '/api/Schemas'
import SongRow from '/components/SongRow'

// @ts-ignore
const Editable = lazy(() =>
  import('/../lib/react-bootstrap-editable/src/Editable')
)

interface Props {
  songs: (SongItem | null)[]
  updateSong: (id: string, song: SongItem | null) => void
}

interface State {
  deleting: SongItem[]
}

const SongsTable: FunctionComponent<Props> = ({ songs, updateSong }) => {
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
        {songs.map((song: SongItem | null, idx) => (
          <SongRow key={idx} song={song} updateSong={updateSong} />
        ))}
      </tbody>
    </Table>
  )
}

export default SongsTable
