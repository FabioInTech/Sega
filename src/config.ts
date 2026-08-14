// Internal render resolution — nearest-neighbor scaled up by Phaser's Scale Manager.
export const VIEW_WIDTH = 384;
export const VIEW_HEIGHT = 288;

export const CAR_WIDTH = 11;
export const CAR_HEIGHT = 19;

export const FUEL_MAX = 100;
export const FUEL_PICKUP_AMOUNT = 22;
export const FUEL_CATCHUP_PENALTY = 13;
export const FUEL_BASE_DRAIN_PER_SEC = 1.35;
export const FUEL_THROTTLE_DRAIN_PER_SEC = 1.15;

export const TRACK_STEP = 24; // arc-length spacing between generated waypoints (world px)

export const STORAGE_KEY = 'retro-hot-rod-save-v1';

export const CATCHUP_MARGIN = 26; // extra world px beyond half-viewport before a car is caught up
export const CATCHUP_RESPAWN_BEHIND = 70; // world px behind leader a caught-up car reappears

export const AI_COUNT = 3;

export const PLAYER_COLORS = {
  player: 0xe8483a,
  rival1: 0x3ba6e8,
  rival2: 0xf0c419,
  rival3: 0x53c65f
};
