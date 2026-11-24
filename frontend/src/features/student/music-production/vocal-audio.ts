import { type VocalSettings } from "./vocal-model";
import { readVocal } from "./vocal-store";
export async function readVocalBuffer(
  scope: string,
  id: string,
  ctx: BaseAudioContext,
) {
  const blob = await readVocal(scope, id);
  if (!blob)
    throw Error(
      "Voice audio is missing on this device. Reattach the selected take or mute Vocals before exporting an instrumental.",
    );
  return ctx.decodeAudioData(await blob.arrayBuffer());
}
export interface VoiceBus {
  gain: GainNode;
  pan: StereoPannerNode;
  wet: GainNode;
  disconnect: () => void;
}
export function voiceBus(ctx: BaseAudioContext, output: AudioNode): VoiceBus {
  const gain = ctx.createGain(),
    pan = ctx.createStereoPanner(),
    wet = ctx.createGain(),
    room = ctx.createConvolver(),
    impulse = ctx.createBuffer(
      2,
      Math.floor(ctx.sampleRate * 0.7),
      ctx.sampleRate,
    );
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < data.length; i++)
      data[i] =
        Math.sin(i * 12.9898 + c * 78.233) *
        Math.exp(-i / (ctx.sampleRate * 0.12)) *
        0.2;
  }
  room.buffer = impulse;
  gain.connect(pan);
  pan.connect(output);
  pan.connect(room);
  room.connect(wet);
  wet.connect(output);
  return {
    gain,
    pan,
    wet,
    disconnect: () => {
      gain.disconnect();
      pan.disconnect();
      wet.disconnect();
      room.disconnect();
    },
  };
}
export function updateVoice(
  bus: VoiceBus,
  settings: VocalSettings,
  audible: boolean,
  time: number,
  immediate = false,
) {
  for (const [param, value] of [
    [bus.gain.gain, audible ? settings.volume : 0],
    [bus.pan.pan, settings.pan],
    [bus.wet.gain, settings.reverb],
  ] as [AudioParam, number][]) {
    param.cancelScheduledValues(time);
    if (immediate) param.setValueAtTime(value, time);
    else param.setTargetAtTime(value, time, 0.015);
  }
}
