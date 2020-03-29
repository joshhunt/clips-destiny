import { createContext, useContext } from 'react';
import { DestinyWorldDefinitions } from './types';

const definitionsContext = createContext<DestinyWorldDefinitions>({});
export default definitionsContext;

export const useDefinitions = () => {
  return useContext(definitionsContext);
};
