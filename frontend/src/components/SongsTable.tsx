import { faBan } from '@fortawesome/free-solid-svg-icons/faBan'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { lazy, Suspense } from 'react'
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
  downloads: boolean
  isAdmin: boolean
  loggedIn: boolean
  updateSongMetadata: (song: SongItem, options: object) => void
  reloadPage: () => void
  updateSong: (id: string, song: SongItem | null) => void
}

interface State {
  deleting: SongItem[]
}

class SongsTable extends React.Component<Props, State> {
  static defaultProps = {
    songs: [],
    downloads: false,
    isAdmin: false,
    loggedIn: false
  }

  state = {
    deleting: [] as SongItem[]
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.loggedIn !== prevProps.loggedIn) {
      this.props.reloadPage()
    }
  }

  render() {
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
          {this.props.songs.map((song: SongItem) => (
            <SongRow
              key={song.id}
              song={song}
              updateSong={this.props.updateSong}
            />
          ))}
        </tbody>
      </Table>
    )
  }
}

export default view(SongsTable)
