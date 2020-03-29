/* eslint-disable promise/catch-or-return */
import React, { useEffect, useState } from 'react';
import { useDefinitions } from '../utils/definitions';
import { DestinyActivityDefinitionCollection } from '../utils/definitions/types';

function getActivityName(
  activity,
  DestinyActivityDefinition: DestinyActivityDefinitionCollection
) {
  const directorAcitivty =
    DestinyActivityDefinition[activity.activityDetails.directorActivityHash];

  const referenceActivity =
    DestinyActivityDefinition[activity.activityDetails.referenceId];

  if (!directorAcitivty || !referenceActivity) {
    return null;
  }

  if (
    directorAcitivty.displayProperties.name ===
    referenceActivity.displayProperties.name
  ) {
    return directorAcitivty.displayProperties.name;
  }
  return `${directorAcitivty.displayProperties.name} (${referenceActivity.displayProperties.name})`;
}

const Activity: React.FC = ({ activity }) => {
  const { DestinyActivityDefinition } = useDefinitions();

  if (!DestinyActivityDefinition) {
    return null;
  }

  return <span>{getActivityName(activity, DestinyActivityDefinition)}</span>;
};

export default Activity;
