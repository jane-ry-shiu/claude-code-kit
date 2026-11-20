const LEAD = 0.15; // seconds between a subtitle appearing and its voice starting

/**
 * ffmpeg arguments that lay each clip at its time (`t`, seconds) over the video's own stream, video copied.
 * The voices are mixed over a silent track exactly `videoDuration` seconds long, which sets the audio length. An endless
 * pad cut by -shortest made ffmpeg 8 fail at random with "No space left on device", and apad=whole_dur at random
 * stopped at the last voice instead.
 */
export function mixArgs(video, clips, out, videoDuration) {
  if (!(videoDuration > 0)) throw new Error(`mixArgs needs the video duration in seconds, got ${videoDuration}`);
  const delays = clips.map((c, i) => {
    const ms = Math.round((c.t + LEAD) * 1000);
    return `[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`;
  });
  const base = `anullsrc=r=44100:cl=mono,atrim=end=${videoDuration}[base]`;
  const voices = clips.map((_, i) => `[a${i}]`).join('');
  const graph = `${base};${delays.join(';')};[base]${voices}amix=inputs=${clips.length + 1}:normalize=0:duration=first[aout]`;
  return [
    '-loglevel', 'error', '-y', '-i', video,
    ...clips.flatMap((c) => ['-i', c.wav]),
    '-filter_complex', graph, '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', out,
  ];
}

/** Times (seconds from the video start) at which the recorder showed each caption. */
export function markTimes(recMeta) {
  return recMeta.events.filter((e) => e.type === 'mark').map((e) => e.t);
}
