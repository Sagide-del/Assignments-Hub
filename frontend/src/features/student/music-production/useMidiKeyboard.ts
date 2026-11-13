import { useEffect, useRef, useState } from "react";
export function useMidiKeyboard(onNote: (midi: number) => void) {
  const alive = useRef(true),
    listener = useRef(onNote),
    cleanup = useRef<() => void>(() => {}),
    [status, setStatus] = useState("Connect MIDI");
  listener.current = onNote;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cleanup.current();
    };
  }, []);
  async function connect() {
    if (!navigator.requestMIDIAccess) {
      setStatus("Use the on-screen keys");
      return;
    }
    try {
      const midi = await navigator.requestMIDIAccess({ sysex: false });
      if (!alive.current) return;
      const bind = () => {
        cleanup.current();
        const removers: (() => void)[] = [];
        let count = 0;
        for (const input of midi.inputs.values()) {
          count++;
          const handler = (e: MIDIMessageEvent) => {
            const d = e.data;
            if (d && d.length >= 3 && (d[0] & 0xf0) === 0x90 && d[2] > 0)
              listener.current(d[1]);
          };
          input.addEventListener("midimessage", handler);
          removers.push(() =>
            input.removeEventListener("midimessage", handler),
          );
        }
        midi.onstatechange = bind;
        cleanup.current = () => {
          removers.forEach((fn) => fn());
          midi.onstatechange = null;
        };
        setStatus(count ? "MIDI connected" : "No MIDI keyboard found");
      };
      bind();
    } catch {
      setStatus("MIDI unavailable · use on-screen keys");
    }
  }
  return {
    connect,
    status,
    supported:
      typeof navigator !== "undefined" && !!navigator.requestMIDIAccess,
  };
}
