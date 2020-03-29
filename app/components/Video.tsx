/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { useState } from 'react';
import { BasicVideoData, dateRangeOverlaps } from './utils';

import styles from './Home.scss';
import Activity from './Activity';
import { ActivityRecord } from './data';

interface VideoProps {
  video: BasicVideoData;
  activityHistory: ActivityRecord[];
}

interface ExtendedVideoData extends BasicVideoData {
  startDate?: Date;
  activities?: ActivityRecord[];
}

function useExtendedVideoData(
  video: BasicVideoData,
  videoDurationSeconds: number,
  activityHistory: ActivityRecord[]
): ExtendedVideoData {
  if (videoDurationSeconds === 0) {
    return video;
  }

  const startDate = new Date(video.endDate);
  startDate.setSeconds(startDate.getSeconds() - videoDurationSeconds);

  const overlappingActivities = activityHistory.filter(activity => {
    return dateRangeOverlaps(
      startDate,
      video.endDate,
      activity.playerStart,
      activity.playerEnd
    );
  });

  return {
    ...video,
    startDate,
    activities: overlappingActivities
  };
}

const Video: React.FC<VideoProps> = ({ video, activityHistory }) => {
  const [videoTime, setVideoTime] = useState(0);
  const [videoDurationSeconds, setVideoDuration] = useState(0);

  const extendedVideoData = useExtendedVideoData(
    video,
    videoDurationSeconds,
    activityHistory
  );

  const videoPositionPercent =
    (videoTime || videoDurationSeconds) === 0
      ? 0
      : videoTime / videoDurationSeconds;

  const videoStartReal =
    extendedVideoData.startDate && extendedVideoData.startDate.getTime();
  const videoStart = 0;
  const videoEnd = videoStartReal && video.endDate.getTime() - videoStartReal;

  return (
    <div className={styles.videoBlock} key={video.fileName}>
      <div>{video.fileName}</div>
      <br />
      <video
        className={styles.video}
        src={video.filePath}
        controls
        onTimeUpdate={ev => setVideoTime(ev.target.currentTime)}
        onDurationChange={ev => setVideoDuration(ev.target.duration)}
      />
      <br />
      {/* videoTime: {videoTime} /{videoDuration} */}
      <br />

      <p>
        matched{' '}
        {extendedVideoData.activities
          ? extendedVideoData.activities.length
          : 'null'}{' '}
        activities
      </p>

      <div className={styles.container}>
        <div className={styles.timelineContainer}>
          <div className={styles.timeline} />

          <div
            className={styles.videoHead}
            style={{ left: `${videoPositionPercent * 100}%` }}
          />

          {videoStartReal &&
            videoEnd &&
            extendedVideoData.activities &&
            extendedVideoData.activities.map(activity => {
              const playerStart = Math.max(
                videoStart,
                activity.playerStart.getTime() - videoStartReal
              );
              const playerEnd = Math.min(
                videoEnd,
                activity.playerEnd.getTime() - videoStartReal
              );

              const startPercent = (playerStart / videoEnd) * 100;
              const durationPercent =
                ((playerEnd - playerStart) / videoEnd) * 100;

              return (
                <div
                  key={activity.pgcrId}
                  className={styles.activityTimelineItem}
                  style={{
                    left: `${startPercent}%`,
                    width: `${durationPercent}%`
                  }}
                >
                  <Activity activity={activity.activity} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Video;
