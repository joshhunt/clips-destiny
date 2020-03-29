/* eslint-disable no-await-in-loop */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-restricted-syntax */

import fs from 'fs';
import path from 'path';
import util from 'util';
import asyncLib from 'async';
import { getVideoDurationInSeconds } from 'get-video-duration';

import { DestinyHistoricalStatsPeriodGroup } from 'bungie-api-ts/destiny2';
import { getCompleteActivityHistory } from '../utils/destinyAPI';

const readdir = util.promisify(fs.readdir);

const VIDEO_DIR = '/Users/joshhunt/Desktop/Videos';

const VIDEO_REGEX = /^Destiny 2 (?<year>\d{4})\.(?<month>\d{2})\.(?<day>\d{2}) - (?<hour>\d{2})\.(?<minute>\d{2})\.(?<seconds>\d{2})\.(?<milliseconds>\d{2})\.DVR\.mp4$/;

export interface ActivityRecord {
  pgcrId: string;
  activityDurationSeconds: number;
  playerDurationSeconds: number;
  activityStart: Date;
  activityEnd: Date;
  playerStart: Date;
  playerEnd: Date;
  activity: DestinyHistoricalStatsPeriodGroup;
}

export async function getActivities(
  membershipType: string,
  membershipID: string
): Promise<ActivityRecord[]> {
  const activities = await getCompleteActivityHistory(
    membershipType,
    membershipID
  );

  const tableData = activities.map(activity => {
    const durationSeconds = activity.values.activityDurationSeconds.basic.value;

    const activityStart = new Date(activity.period);
    const activityEnd = new Date(activityStart);
    activityEnd.setSeconds(activityEnd.getSeconds() + durationSeconds);

    const playerStartSeconds = activity.values.startSeconds.basic.value;
    const playerDurationSeconds = activity.values.timePlayedSeconds.basic.value;

    const playerStart = new Date(activityStart);
    playerStart.setSeconds(playerStart.getSeconds() + playerStartSeconds);
    const playerEnd = new Date(playerStart);
    playerEnd.setSeconds(playerEnd.getSeconds() + playerDurationSeconds);

    return {
      pgcrId: activity.activityDetails.instanceId,
      activityDurationSeconds: durationSeconds,
      playerDurationSeconds,
      activityStart,
      activityEnd,
      playerStart,
      playerEnd,
      activity
    };
  });

  return tableData;
}

function dateRangeOverlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  if (aStart <= bStart && bStart <= aEnd) return true; // b starts in a
  if (aStart <= bEnd && bEnd <= aEnd) return true; // b ends in a
  if (bStart < aStart && aEnd < bEnd) return true; // a in b
  return false;
}

export interface VideoRecord {
  videoPath: string;
  fileName: string;

  videoStart: Date;
  videoEnd: Date;
  videoDuration: number;

  firstActivityStart: Date | null;
  lastActivityEnd: Date | null;

  superStart: Date | null;
  superEnd: Date | null;

  activites: any[];
}

const CONCURRENT_VIDEOS = 10;
export async function listVideos(cb: (videoRecord: VideoRecord) => void) {
  const activities = await getActivities();

  const files = (await readdir(VIDEO_DIR)) as string[];

  const videoFiles = files.filter(fileName => fileName.match(VIDEO_REGEX));

  asyncLib.eachOfLimit(
    videoFiles,
    CONCURRENT_VIDEOS,
    async (fileName: string) => {
      const videoPath = path.join(VIDEO_DIR, fileName);
      const durationSeconds = await getVideoDurationInSeconds(videoPath);

      const reResults = fileName.match(VIDEO_REGEX);

      if (!reResults || !reResults.groups) {
        return cb();
      }

      const params = reResults.groups;

      const endDate = new Date(
        parseInt(params.year, 10),
        parseInt(params.month, 10) - 1,
        parseInt(params.day, 10),
        parseInt(params.hour, 10),
        parseInt(params.minute, 10),
        parseInt(params.seconds, 10),
        parseInt(params.milliseconds, 10)
      );

      const startDate = new Date(endDate);
      startDate.setSeconds(startDate.getSeconds() - durationSeconds);

      const overlappingActivities = activities.filter(activity => {
        return dateRangeOverlaps(
          startDate,
          endDate,
          activity.playerStart,
          activity.playerEnd
        );
      });

      const firstActivityStart = overlappingActivities.reduce(
        (currentBest: Date | null, activity) => {
          if (!currentBest) {
            return activity.playerStart;
          }

          return activity.playerStart < currentBest
            ? activity.playerStart
            : currentBest;
        },
        null
      );

      const lastActivityEnd = overlappingActivities.reduce(
        (currentBest: Date | null, activity) => {
          if (!currentBest) {
            return activity.playerEnd;
          }

          return activity.playerEnd > currentBest
            ? activity.playerEnd
            : currentBest;
        },
        null
      );

      const superStart =
        startDate < firstActivityStart ? startDate : firstActivityStart;
      const superEnd = endDate > lastActivityEnd ? endDate : lastActivityEnd;

      cb({
        videoPath: path.join(VIDEO_DIR, fileName),
        fileName,

        videoStart: startDate,
        videoEnd: endDate,
        videoDuration: durationSeconds * 1000,

        firstActivityStart,
        lastActivityEnd,

        superStart,
        superEnd,

        activites: overlappingActivities
      });
    }
  );
}
