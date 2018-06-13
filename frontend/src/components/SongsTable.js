import React from 'react'
import { readable_filesize } from '../utils'
import { Button, Form, Table, UncontrolledTooltip } from 'reactstrap'
import FontAwesome from 'react-fontawesome'

class SongsTable extends React.Component {
  static defaultProps = {
    songs: [],
    downloads: false,
    requestSong: () => undefined
  }


  render() {
    return (
      <Table striped>
        <thead>
        <tr className='d-flex'>
          <th className='col-4'>Artist</th>
          <th className='col-5'>Title</th>
          <th className='col-3' />
        </tr>
        </thead>
        <tbody>
        {this.props.songs.map(song => (
          <tr key={song.id} className='d-flex'>
            <td className='col-4'>{song.artist}</td>
            <td className='col-5'>{song.title}</td>
            <td className='col text-right'>
              <Form inline className='justify-content-end'>
                <div className='disabled-button-wrapper' id={`request-${song.id}`}>
                  <Button disabled={!song.meta.requestable}
                          color={!song.meta.requestable ? 'danger' : undefined}
                          onClick={() => this.props.requestSong(song)}>
                    Request
                  </Button>
                </div>
                <UncontrolledTooltip
                  placement='top'
                  target={`request-${song.id}`}
                  delay={0}>
                  {song.meta.requestable && `Last played: ${song.meta.humanized_lastplayed}`}
                  {!song.meta.requestable && song.meta.reason}
                </UncontrolledTooltip>
                &nbsp;
                {this.props.downloads && (
                  <Button className='px-3' tag='a' href={`/api/v1/download/${song.id}`} id={`download-${song.id}`}>
                    <FontAwesome name='download' />
                    <UncontrolledTooltip
                      placement='top'
                      target={`download-${song.id}`}
                      delay={0}>
                      {readable_filesize(song.size)}
                    </UncontrolledTooltip>
                  </Button>
                )}
              </Form>
            </td>
          </tr>
        ))}
        </tbody>
      </Table>
    )
  }
}

export default SongsTable
