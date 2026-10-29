import { lookup } from "dns/promises";
import { request } from "https";
import { BlockList, isIP } from "net";
const blocked = new BlockList();
for (const [ip, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as [string, number][])
  blocked.addSubnet(ip, bits, "ipv4");
export function publicAddress(address: string) {
  if (isIP(address) === 4) return !blocked.check(address, "ipv4");
  if (isIP(address) === 6)
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
  return false;
}
export function collectionUrl(raw: string, hosts: string[], base?: string) {
  const u = new URL(raw, base);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !hosts.includes(u.hostname.toLowerCase())
  )
    throw Error(
      "This collection host is not enabled. Use an authorised folder/ZIP or ask the platform operator to configure CONTENT_SOURCE_HOSTS.",
    );
  u.hash = "";
  return u.href;
}
export function remotePdfName(disposition: string | undefined) {
  if (!disposition) return undefined;
  let name = disposition
    .match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1]
    ?.replace(/^["']|["']$/g, "");
  if (name) {
    try {
      name = decodeURIComponent(name);
    } catch {
      return undefined;
    }
  } else
    name = disposition
      .match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
      ?.slice(1)
      .find(Boolean)
      ?.trim();
  name = name
    ?.replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\x00-\x1f<>]/g, "")
    .trim()
    .slice(0, 180);
  return name && /\.pdf$/i.test(name) ? name : undefined;
}
export async function fetchCollection(
  raw: string,
  hosts: string[],
): Promise<{ url: string; bytes: Buffer; type: string; fileName?: string }> {
  let url = collectionUrl(raw, hosts);
  for (let n = 0; n < 5; n++) {
    const u = new URL(url),
      addresses = await lookup(u.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw Error("Collection host resolved to a non-public address.");
    const target = addresses.find((a) => a.family === 4) ?? addresses[0];
    const result = await new Promise<{
      status: number;
      location?: string;
      bytes: Buffer;
      type: string;
      fileName?: string;
    }>((resolve, reject) => {
      const req = request(
        u,
        {
          method: "GET",
          headers: {
            "User-Agent": "AssignmentHub-ContentImporter/1.0",
            "Accept-Encoding": "identity",
          },
          lookup: ((_host: string, options: any, callback: any) =>
            options.all
              ? callback(null, [target])
              : callback(null, target.address, target.family)) as any,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (b: Buffer) => {
            size += b.length;
            if (size > 15 * 1024 * 1024) {
              req.destroy(Error("Remote document exceeds 15 MB."));
              return;
            }
            chunks.push(b);
          });
          res.on("end", () =>
            resolve({
              status: res.statusCode ?? 0,
              location: res.headers.location,
              bytes: Buffer.concat(chunks),
              type: res.headers["content-type"] ?? "",
              fileName: remotePdfName(res.headers["content-disposition"]),
            }),
          );
          res.on("error", reject);
        },
      );
      const timeout = setTimeout(
        () => req.destroy(Error("Collection download timed out.")),
        25000,
      );
      req.on("close", () => clearTimeout(timeout));
      req.on("error", reject);
      req.end();
    });
    if (result.status >= 300 && result.status < 400 && result.location) {
      url = collectionUrl(result.location, hosts, url);
      continue;
    }
    if (result.status !== 200)
      throw Error(`Collection returned HTTP ${result.status}.`);
    return {
      url,
      bytes: result.bytes,
      type: result.type,
      ...(result.fileName ? { fileName: result.fileName } : {}),
    };
  }
  throw Error("Too many collection redirects.");
}
