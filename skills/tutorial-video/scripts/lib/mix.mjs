const LEAD = 0.15; // seconds between a subtitle appearing and its voice starting

/** ffmpeg arguments that lay each clip at its time (`t`, seconds) over the video's own stream, video copied. */
export function mixArgs(video, clips, out) {
  const delays = clips.map((c, i) => {
    const ms = Math.round((c.t + LEAD) * 1000);
    return `[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`;
  });
  const graph = `${delays.join(';')};${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad[aout]`;
  return [
    '-loglevel', 'error', '-y', '-i', video,
    ...clips.flatMap((c) => ['-i', c.wav]),
    '-filter_complex', graph, '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out,
  ];
}

/** Times (seconds from the video start) at which the recorder showed each caption. */
export function markTimes(recMeta) {
  return recMeta.events.filter((e) => e.type === 'mark').map((e) => e.t);
}
