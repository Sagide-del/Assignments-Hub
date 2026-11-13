// The maintained encoder is installed under the lamejs alias; its package
// declaration retains the upstream package name, so describe this alias here.
declare module "lamejs" {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
}
