import type Phaser from 'phaser';

export const audioKeys = {
  click: 'click',
  boatMove: 'boatMove',
  win: 'win',
  lose: 'lose',
  titleMusic: 'titleMusic',
  backgroundMusic: 'backgroundMusic',
} as const;

export type AudioChannel = 'sfx' | 'voice' | 'ambience';

export const audioPaths = {
  sfx: {
    [audioKeys.lose]: 'assets/audio/sfx/lose.mp3',
  },
  ambience: {
    [audioKeys.titleMusic]: 'assets/audio/start.MP3',
    [audioKeys.backgroundMusic]: 'assets/audio/ambience/envir.mp3',
  },
} as const;

export const defaultAudioVolumes: Record<AudioChannel, number> = {
  sfx: 0.6,
  voice: 0.8,
  ambience: 0.2,
} as const;

export type AudioSettings = {
  muted: boolean;
  volumes: Record<AudioChannel, number>;
};

const AUDIO_SETTINGS_KEY = 'river-crossing.audioSettings';

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 10) / 10));
}

function defaultAudioSettings(): AudioSettings {
  return {
    muted: false,
    volumes: { ...defaultAudioVolumes },
  };
}

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return defaultAudioSettings();
  const stored = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
  if (!stored) return defaultAudioSettings();

  try {
    const parsed = JSON.parse(stored) as Partial<AudioSettings>;
    const defaults = defaultAudioSettings();
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted,
      volumes: {
        sfx: typeof parsed.volumes?.sfx === 'number' ? clampVolume(parsed.volumes.sfx) : defaults.volumes.sfx,
        voice: typeof parsed.volumes?.voice === 'number' ? clampVolume(parsed.volumes.voice) : defaults.volumes.voice,
        ambience: typeof parsed.volumes?.ambience === 'number' ? clampVolume(parsed.volumes.ambience) : defaults.volumes.ambience,
      },
    };
  } catch {
    return defaultAudioSettings();
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
    muted: settings.muted,
    volumes: {
      sfx: clampVolume(settings.volumes.sfx),
      voice: clampVolume(settings.volumes.voice),
      ambience: clampVolume(settings.volumes.ambience),
    },
  }));
}

export function setAudioChannelVolume(channel: AudioChannel, value: number): AudioSettings {
  const settings = loadAudioSettings();
  settings.volumes[channel] = clampVolume(value);
  saveAudioSettings(settings);
  return settings;
}

export function setAudioMuted(muted: boolean): AudioSettings {
  const settings = loadAudioSettings();
  settings.muted = muted;
  saveAudioSettings(settings);
  return settings;
}

type VolumeSound = Phaser.Sound.BaseSound & {
  setVolume?: (value: number) => unknown;
  volume?: number;
};

function setSoundVolume(sound: VolumeSound, volume: number) {
  if (typeof sound.setVolume === 'function') {
    sound.setVolume(volume);
    return;
  }
  sound.volume = volume;
}

export function applyAudioSettings(sound: Phaser.Sound.BaseSoundManager) {
  const settings = loadAudioSettings();
  sound.mute = settings.muted;
  updateLoopingMusicVolume(sound);
}

function startLoopingMusic(sound: Phaser.Sound.BaseSoundManager, key: string) {
  const settings = loadAudioSettings();
  sound.mute = settings.muted;

  const existing = sound.getAll<VolumeSound>(key)
    .find((item) => !item.pendingRemove);
  if (existing) {
    setSoundVolume(existing, settings.volumes.ambience);
    if (existing.isPaused) {
      existing.resume();
    } else if (!existing.isPlaying) {
      existing.play({ loop: true, volume: settings.volumes.ambience });
    }
    return;
  }

  sound.add(key, {
    loop: true,
    volume: settings.volumes.ambience,
  }).play();
}

export function startTitleMusic(sound: Phaser.Sound.BaseSoundManager) {
  sound.stopByKey(audioKeys.backgroundMusic);
  startLoopingMusic(sound, audioKeys.titleMusic);
}

export function stopTitleMusic(sound: Phaser.Sound.BaseSoundManager) {
  sound.stopByKey(audioKeys.titleMusic);
}

export function startBackgroundMusic(sound: Phaser.Sound.BaseSoundManager) {
  stopTitleMusic(sound);
  startLoopingMusic(sound, audioKeys.backgroundMusic);
}

export function updateBackgroundMusicVolume(sound: Phaser.Sound.BaseSoundManager) {
  updateLoopingMusicVolume(sound);
}

function updateLoopingMusicVolume(sound: Phaser.Sound.BaseSoundManager) {
  const settings = loadAudioSettings();
  [audioKeys.titleMusic, audioKeys.backgroundMusic].forEach((key) => {
    sound.getAll<VolumeSound>(key).forEach((item) => {
      if (!item.pendingRemove) {
        setSoundVolume(item, settings.volumes.ambience);
      }
    });
  });
}
