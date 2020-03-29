/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/prefer-default-export */

import { get, set } from 'idb-keyval';
import {
  DestinyHistoricalStatsPeriodGroup,
  DestinyProfileResponse,
  DestinyActivityHistoryResults
} from 'bungie-api-ts/destiny2/interfaces';

export const API_KEY = '477f5823c8a84c66804094302492332e';

async function getBungie<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { 'x-api-key': API_KEY }
  });

  const json = await resp.json();
  return json.Response || json;
}

function getProfile(
  membershipType: string,
  membershipID: string,
  components: (string | number)[]
) {
  return getBungie<DestinyProfileResponse>(
    `https://www.bungie.net/platform/Destiny2/${membershipType}/Profile/${membershipID}/?components=${components.join(
      ','
    )}`
  );
}

function makeActivityKey(activity: DestinyHistoricalStatsPeriodGroup) {
  const pgcrId = activity.activityDetails.instanceId;
  const startSeconds = activity.values.startSeconds.basic.value;

  return `${pgcrId}|${startSeconds}`;
}

function makeActivityKeyLookup(
  activities: DestinyHistoricalStatsPeriodGroup[]
) {
  const lookup: Record<string, boolean> = {};

  activities.forEach(activity => {
    const key = makeActivityKey(activity);
    lookup[key] = true;
  });

  return lookup;
}

const ACTIVITY_COUNT = 200;
async function getCharacterActivityHistory(
  membershipType: string,
  membershipID: string,
  characterID: string,
  previousActivityKeys: Record<string, boolean>
): Promise<DestinyHistoricalStatsPeriodGroup[]> {
  let activities: DestinyHistoricalStatsPeriodGroup[] = [];

  let running = true;
  let page = 0;

  while (running) {
    console.log('Fetching character history', { characterID, page });

    const resp = await getBungie<DestinyActivityHistoryResults>(
      `https://www.bungie.net/Platform/Destiny2/${membershipType}/Account/${membershipID}/Character/${characterID}/Stats/Activities/?count=${ACTIVITY_COUNT}&page=${page}`
    );

    const newActivities: DestinyHistoricalStatsPeriodGroup[] = [];

    for (let index = 0; index < resp.activities.length; index += 1) {
      const activity = resp.activities[index];
      const key = makeActivityKey(activity);

      if (previousActivityKeys[key]) {
        break;
      }

      newActivities.push(activity);
    }

    console.log({ newActivities });

    if (newActivities.length < resp.activities.length) {
      console.log('hit cache, returning');
      activities = activities.concat(newActivities);
      break;
    } else {
      activities = activities.concat(resp.activities);
    }

    page += 1;

    if (resp.activities.length < ACTIVITY_COUNT) {
      // last page, time to return
      running = false;
    }
  }

  return activities;
}

export async function getCompleteActivityHistory(
  membershipType: string,
  membershipID: string
): Promise<DestinyHistoricalStatsPeriodGroup[]> {
  const profile = await getProfile(membershipType, membershipID, [100]);

  const { characterIds } = profile.profile.data || {};

  const previousActivities =
    (await get<DestinyHistoricalStatsPeriodGroup[] | undefined>(
      `activityHistory-${membershipID}`
    )) || [];

  const previousActivityKeys = makeActivityKeyLookup(previousActivities);

  const activityPromises = (characterIds || []).map(characterID => {
    return getCharacterActivityHistory(
      membershipType,
      membershipID,
      characterID,
      previousActivityKeys
    );
  });

  const responses = await Promise.all(activityPromises);
  const newActivities = responses.flat();

  const allActivities = previousActivities.concat(newActivities);

  await set(`activityHistory-${membershipID}`, allActivities);

  // TODO: Probably shouldnt sort these like this...
  return allActivities.sort(
    (a, b) =>
      parseInt(a.activityDetails.instanceId, 10) -
      parseInt(b.activityDetails.instanceId, 10)
  );
}
