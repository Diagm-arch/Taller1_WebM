// js/volume-control.js

const STORAGE_KEY = 'potatodex.master_volume';
const DEFAULT_VOLUME = 0.8;

let currentVolume = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
  } catch (e) {
    console.warn('Storage unavailable:', e);
  }
  return DEFAULT_VOLUME;
})();

let listeners = [];
const connectedAudioElements = new WeakSet();
const activeGainNodes = new Set();

let sharedAudioCtx = null;
let sharedMasterGain = null;

function getSharedContext() {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioCtx = new AudioContextClass();
        sharedMasterGain = sharedAudioCtx.createGain();
        sharedMasterGain.gain.value = currentVolume * currentVolume;
        sharedMasterGain.connect(sharedAudioCtx.destination);
        activeGainNodes.add(sharedMasterGain);
      } catch (err) {
        console.warn('Could not create shared AudioContext:', err);
      }
    }
  }
  return { ctx: sharedAudioCtx, masterGain: sharedMasterGain };
}

// Intercept window.AudioContext to attach a master gain to any context created by minigames (Papahero, TBOP)
const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
if (NativeAudioContext) {
  const OriginalCtx = NativeAudioContext;
  
  const PatchedContext = function (...args) {
    const ctx = new OriginalCtx(...args);
    try {
      const realDest = Object.getOwnPropertyDescriptor(OriginalCtx.prototype, 'destination') 
        ? Object.getOwnPropertyDescriptor(OriginalCtx.prototype, 'destination').get.call(ctx)
        : ctx.destination;

      const masterGain = ctx.createGain();
      masterGain.gain.value = currentVolume * currentVolume;
      masterGain.connect(realDest);
      activeGainNodes.add(masterGain);

      // Override destination getter so connections route through masterGain
      Object.defineProperty(ctx, 'destination', {
        get: () => masterGain,
        configurable: true
      });

      // Cleanup when closed
      const origClose = ctx.close;
      if (origClose) {
        ctx.close = function () {
          activeGainNodes.delete(masterGain);
          return origClose.apply(this, arguments);
        };
      }
    } catch (e) {
      console.warn('Could not wrap AudioContext destination:', e);
    }
    return ctx;
  };
  PatchedContext.prototype = OriginalCtx.prototype;
  window.AudioContext = PatchedContext;
  if (window.webkitAudioContext) window.webkitAudioContext = PatchedContext;
}

// Intercept HTMLMediaElement.prototype.play to route <audio> through WebAudio MasterGain
const origPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function () {
  try {
    if (!connectedAudioElements.has(this)) {
      const { ctx, masterGain } = getSharedContext();
      if (ctx && masterGain) {
        try {
          const source = ctx.createMediaElementSource(this);
          source.connect(masterGain);
          connectedAudioElements.add(this);
        } catch (sourceErr) {
          // If cross-origin or already attached, fallback gracefully
          // console.warn('createMediaElementSource notice:', sourceErr);
        }
      }
    }
  } catch (err) {
    console.warn('Media element routing error:', err);
  }
  return origPlay.apply(this, arguments);
};

export function getVolume() {
  return currentVolume;
}

export function setVolume(vol) {
  currentVolume = Math.max(0, Math.min(1, Number(vol)));
  try {
    localStorage.setItem(STORAGE_KEY, currentVolume.toString());
  } catch (e) {}

  const perceptualGain = currentVolume * currentVolume;

  activeGainNodes.forEach((gainNode) => {
    try {
      if (gainNode && gainNode.gain) {
        if (gainNode.context && gainNode.context.state !== 'closed') {
          gainNode.gain.setTargetAtTime(perceptualGain, gainNode.context.currentTime, 0.015);
        } else {
          gainNode.gain.value = perceptualGain;
        }
      }
    } catch (err) {
      console.warn('Error setting gain on node:', err);
    }
  });

  listeners.forEach((fn) => {
    try {
      fn(currentVolume);
    } catch (err) {
      console.error(err);
    }
  });
}

export function onVolumeChange(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function unlockAudio() {
  const { ctx } = getSharedContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
