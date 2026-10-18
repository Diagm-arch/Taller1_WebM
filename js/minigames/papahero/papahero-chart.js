// js/minigames/papahero/papahero-chart.js

export const DEFAULT_SONG_CONFIG = {
  name: 'SOLO DE GUITARRA (BANDA COMPLETA)',
  audioSources: [
    './assets/rhythmGame/guitar.ogg',
    './assets/rhythmGame/bass.ogg',
    './assets/rhythmGame/drums.ogg',
    './assets/rhythmGame/rhythm.ogg',
    './assets/rhythmGame/vocals.ogg'
  ],
  chartSrc: './assets/rhythmGame/notes1.chart',
  difficulty: 'ExpertSingle', // Lee solo la pista de guitarra para las notas
  approachTime: 1.45
};

export function parseMoonscraperChart(chartText, preferredDiff = 'ExpertSingle') {
  const resMatch = chartText.match(/Resolution\s*=\s*(\d+)/i);
  const resolution = resMatch ? parseInt(resMatch[1], 10) : 192;

  const offsetMatch = chartText.match(/Offset\s*=\s*([-\d.]+)/i);
  const offsetSec = offsetMatch ? parseFloat(offsetMatch[1]) : 0;

  const syncMatch = chartText.match(/\[SyncTrack\]\s*\{([\s\S]*?)\}/i);
  const bpmEvents = [];
  if (syncMatch) {
    const lines = syncMatch[1].split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)\s*=\s*B\s+(\d+)/i);
      if (m) {
        bpmEvents.push({
          tick: parseInt(m[1], 10),
          bpm: parseInt(m[2], 10) / 1000
        });
      }
    }
  }
  if (bpmEvents.length === 0 || bpmEvents[0].tick > 0) {
    bpmEvents.unshift({ tick: 0, bpm: 120 });
  }
  bpmEvents.sort((a, b) => a.tick - b.tick);

  let accTime = 0;
  for (let i = 0; i < bpmEvents.length; i++) {
    if (i > 0) {
      const deltaTicks = bpmEvents[i].tick - bpmEvents[i - 1].tick;
      accTime += (deltaTicks / resolution) * (60 / bpmEvents[i - 1].bpm);
    }
    bpmEvents[i].timeSec = accTime;
  }

  const tickToSeconds = (tick) => {
    let activeBpm = bpmEvents[0];
    for (let i = 0; i < bpmEvents.length; i++) {
      if (bpmEvents[i].tick <= tick) activeBpm = bpmEvents[i];
      else break;
    }
    const deltaTicks = tick - activeBpm.tick;
    return offsetSec + activeBpm.timeSec + (deltaTicks / resolution) * (60 / activeBpm.bpm);
  };

  const diffOrder = [preferredDiff, 'ExpertSingle', 'HardSingle', 'MediumSingle', 'EasySingle'];
  let notesBlock = null;
  for (const diff of diffOrder) {
    const regex = new RegExp(`\\[${diff}\\]\\s*\\{([\\s\\S]*?)\\}`, 'i');
    const match = chartText.match(regex);
    if (match && match[1].includes('= N')) {
      notesBlock = match[1];
      break;
    }
  }
  if (!notesBlock) return [];

  const result = [];
  const seenAtTick = new Set();
  const lines = notesBlock.split('\n');

  for (const line of lines) {
    const m = line.trim().match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/i);
    if (!m) continue;

    const tick = parseInt(m[1], 10);
    const rawFret = parseInt(m[2], 10);
    const sustainTicks = parseInt(m[3], 10);

    if (rawFret === 5 || rawFret === 6 || rawFret > 7) continue;

    const lane = rawFret === 7 ? (tick % 5) : rawFret;
    if (lane < 0 || lane > 4) continue;

    const key = `${tick}-${lane}`;
    if (seenAtTick.has(key)) continue;
    seenAtTick.add(key);

    const startTime = tickToSeconds(tick);
    if (startTime < 0.2) continue;

    const endTime = tickToSeconds(tick + sustainTicks);
    const durationSec = sustainTicks > 0 ? Number((endTime - startTime).toFixed(3)) : 0;

    result.push({
      time: Number(startTime.toFixed(3)),
      lane: lane,
      duration: durationSec >= 0.16 ? durationSec : 0
    });
  }

  return result.sort((a, b) => a.time - b.time);
}

export function getFallbackChart() {
  return [
    { time: 1.5, lane: 0, duration: 0 },
    { time: 2.0, lane: 1, duration: 0 },
    { time: 2.5, lane: 2, duration: 0 },
    { time: 3.0, lane: 3, duration: 0 },
    { time: 3.5, lane: 4, duration: 0.8 },
    { time: 4.5, lane: 0, duration: 0 },
    { time: 5.0, lane: 2, duration: 0 },
    { time: 5.5, lane: 4, duration: 1.2 }
  ];
}

export function createNoteInstances(rawChart) {
  const notes = rawChart.map((n, idx) => ({
    id: idx,
    time: n.time,
    lane: n.lane,
    duration: n.duration || 0,
    hit: false,
    missed: false,
    holding: false,
    holdCompleted: false,
    seed: (idx * 37) % 100
  }));

  const lastNote = notes[notes.length - 1];
  const chartEndTime = lastNote ? lastNote.time + (lastNote.duration || 0) + 2.5 : 30;
  return { notes, chartEndTime };
}
