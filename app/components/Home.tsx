/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable jsx-a11y/media-has-caption */
/* eslint-disable no-console */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
import { remote } from 'electron';
import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import routes from '../constants/routes.json';
import { withDefinitions } from '../utils/definitions';
import Video from './Video';
import { listVideosInDir, BasicVideoData } from './utils';
import { getActivities, ActivityRecord } from './data';

const MEMBERSHIP_TYPE = '2';
const MEMBERSHIP_ID = '4611686018469271298';

function useActivityHistory(membershipType: string, membershipID: string) {
  const [activityHistory, setActivityHistory] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    getActivities(membershipType, membershipID).then(activities =>
      setActivityHistory(activities)
    );
  }, [membershipType, membershipID]);

  return activityHistory;
}

function Home() {
  const [folderPath, setFolderPath] = useState<string>();
  const [videos, setVideos] = useState<BasicVideoData[]>([]);

  const activityHistory = useActivityHistory(MEMBERSHIP_TYPE, MEMBERSHIP_ID);

  useEffect(() => {
    folderPath && listVideosInDir(folderPath).then(v => setVideos(v));
  }, [folderPath]);

  function promptForFolder() {
    console.log('trying to open dialog');

    remote.dialog
      .showOpenDialog(remote.getCurrentWindow(), {
        properties: ['openDirectory']
      })
      .then(result => {
        console.log('open dialog result', result);
        const folderResult = result.filePaths && result.filePaths[0];

        folderResult && setFolderPath(folderResult);
      })
      .catch(err => console.log('dialog error', err));
  }

  return (
    <div data-tid="container">
      <h2>Home</h2>

      <button type="button" onClick={promptForFolder}>
        Open folder
      </button>

      <br />

      <p>Loaded {activityHistory.length} activities</p>

      {videos.map(video => {
        return (
          <Video
            key={video.filePath}
            video={video}
            activityHistory={activityHistory}
          />
        );
      })}

      <Link to={routes.COUNTER}>to Counter</Link>
    </div>
  );
}

export default withDefinitions(Home, ['DestinyActivityDefinition']);
