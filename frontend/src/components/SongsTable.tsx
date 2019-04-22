import React from 'react'
import { view } from 'react-easy-state'
import FontAwesome from 'react-fontawesome'
import Editable from 'react-x-editable'
import { Button, Form, Table, UncontrolledTooltip } from 'reactstrap'
import { SongItem } from '../api/Schemas'
import { readableFilesize } from '../utils'

interface Props {
  songs: SongItem[]
  downloads: boolean
  isAdmin: boolean
  loggedIn: boolean
  deleteSong: (song: SongItem) => void
  downloadSong: (song: SongItem) => void
  requestSong: (song: SongItem) => void
  favouriteSong: (song: SongItem, favourite?: boolean) => void
  updateSongMetadata: (song: SongItem, options: object) => void
  reloadPage: () => void
}

interface State {
  deleting: SongItem[]
}

class SongsTable extends React.Component<Props, State> {
  static defaultProps = {
    songs: [],
    downloads: false,
    isAdmin: false,
    loggedIn: false,
  }

  state = {
    deleting: [] as SongItem[],
  }

  componentDidUpdate(prevProps) {
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
            <tr key={song.id} className="d-flex">
              <td className="col-3">
                {this.props.isAdmin ? (
                  <Editable
                    name="artist"
                    dataType="text"
                    mode="inline"
                    value={song.artist}
                    bootstrap4
                    handleSubmit={val =>
                      this.props.updateSongMetadata(song, {
                        artist: val.value,
                      })
                    }
                  />
                ) : (
                  song.artist
                )}
              </td>
              <td className="col-5">
                {this.props.isAdmin ? (
                  <Editable
                    name="title"
                    dataType="text"
                    mode="inline"
                    value={song.title}
                    bootstrap4
                    handleSubmit={val =>
                      this.props.updateSongMetadata(song, {
                        title: val.value,
                      })
                    }
                  />
                ) : (
                  song.title
                )}
              </td>
              <td className="col text-right">
                <Form inline className="justify-content-end">
                  <div
                    className="disabled-button-wrapper"
                    id={`request-${song.id}`}>
                    <Button
                      disabled={!song.meta.requestable}
                      color={!song.meta.requestable ? 'danger' : undefined}
                      onClick={() => this.props.requestSong(song)}>
                      Request
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
                  &nbsp;
                  {this.props.loggedIn && (
                    <Button
                      className="px-2"
                      id={`favourite-${song.id}`}
                      color={song.meta.favourited ? 'danger' : undefined}
                      onClick={() =>
                        this.props.favouriteSong(song, song.meta.favourited)
                      }>
                      <FontAwesome
                        fixedWidth
                        name={song.meta.favourited ? 'ban' : 'heart'}
                      />
                      <UncontrolledTooltip
                        placement="top"
                        target={`favourite-${song.id}`}
                        delay={0}>
                        {song.meta.favourited ? 'Unfavourite' : 'Favourite'}
                      </UncontrolledTooltip>
                    </Button>
                  )}
                  &nbsp;
                  {this.props.downloads && (
                    <Button
                      className="px-2"
                      onClick={() => this.props.downloadSong(song)}
                      id={`download-${song.id}`}>
                      <FontAwesome fixedWidth name="download" />
                      <UncontrolledTooltip
                        placement="top"
                        target={`download-${song.id}`}
                        delay={0}>
                        {readableFilesize(song.size)}
                      </UncontrolledTooltip>
                    </Button>
                  )}
                  &nbsp;
                  {this.props.isAdmin && (
                    <Button
                      className="px-2"
                      id={`delete-${song.id}`}
                      color={
                        this.state.deleting.includes(song)
                          ? 'danger'
                          : 'warning'
                      }
                      onClick={() => {
                        this.state.deleting.includes(song)
                          ? this.props.deleteSong(song)
                          : this.setState({
                              deleting: [song, ...this.state.deleting],
                            })
                      }}>
                      <FontAwesome
                        fixedWidth
                        name={
                          this.state.deleting.includes(song)
                            ? 'exclamation-triangle'
                            : 'trash'
                        }
                      />
                      <UncontrolledTooltip
                        placement="top"
                        target={`delete-${song.id}`}
                        delay={0}>
                        {this.state.deleting.includes(song)
                          ? 'Press again to delete permanently'
                          : 'Delete'}
                      </UncontrolledTooltip>
                    </Button>
                  )}
                  &nbsp;
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }
}

export default view(SongsTable)
