/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import path from 'path';
import util from 'util';
import { sortBy } from 'lodash';

const readdir = util.promisify(fs.readdir);

const VIDEO_REGEX = /^Destiny 2 (?<year>\d{4})\.(?<month>\d{2})\.(?<day>\d{2}) - (?<hour>\d{2})\.(?<minute>\d{2})\.(?<seconds>\d{2})\.(?<milliseconds>\d{2})\.DVR\.mp4$/;

export interface BasicVideoData {
  fileName: string;
  filePath: string;
  endDate: Date;
}

export async function listVideosInDir(folderDir: string) {
  const files = await readdir(folderDir);

  const videos: BasicVideoData[] = [];

  files.forEach(fileName => {
    const reResult = fileName.match(VIDEO_REGEX);
    const filePath = path.join(folderDir, fileName);

    if (!reResult || !reResult.groups) {
      return;
    }

    const params = reResult.groups;

    const endDate = new Date(
      Number(params.year),
      Number(params.month) - 1,
      Number(params.day),
      Number(params.hour),
      Number(params.minute),
      Number(params.seconds),
      Number(params.milliseconds)
    );

    videos.push({
      fileName,
      filePath,
      endDate
    });
  });

  return sortBy(videos, video => video.endDate);
}

export function dateRangeOverlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  if (aStart <= bStart && bStart <= aEnd) return true; // b starts in a
  if (aStart <= bEnd && bEnd <= aEnd) return true; // b ends in a
  if (bStart < aStart && aEnd < bEnd) return true; // a in b
  return false;
}
