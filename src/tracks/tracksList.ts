import type { TrackConfig } from '../types';

export const TRACKS: TrackConfig[] = [
  {
    id: 'city-lights',
    name: 'City Lights Sprint',
    theme: 'city',
    seed: 1337,
    length: 4600,
    curviness: 0.55,
    roadWidth: 132,
    hazardDensity: 0.7,
    sceneryDensity: 0.9,
    forkCount: 2,
    finishFraction: 0.97
  },
  {
    id: 'coast-highway',
    name: 'Coast Highway 9',
    theme: 'highway',
    seed: 4242,
    length: 5400,
    curviness: 0.35,
    roadWidth: 148,
    hazardDensity: 0.45,
    sceneryDensity: 0.55,
    forkCount: 1,
    finishFraction: 0.97
  },
  {
    id: 'green-valley',
    name: 'Green Valley Run',
    theme: 'countryside',
    seed: 777,
    length: 5000,
    curviness: 0.5,
    roadWidth: 126,
    hazardDensity: 0.5,
    sceneryDensity: 0.75,
    forkCount: 2,
    finishFraction: 0.97
  },
  {
    id: 'dust-basin',
    name: 'Dust Basin Trail',
    theme: 'desert',
    seed: 9001,
    length: 5200,
    curviness: 0.62,
    roadWidth: 118,
    hazardDensity: 0.6,
    sceneryDensity: 0.6,
    forkCount: 1,
    finishFraction: 0.97
  },
  {
    id: 'frost-pass',
    name: 'Frost Pass',
    theme: 'snow',
    seed: 2024,
    length: 5600,
    curviness: 0.68,
    roadWidth: 122,
    hazardDensity: 0.65,
    sceneryDensity: 0.65,
    forkCount: 2,
    finishFraction: 0.97
  }
];
