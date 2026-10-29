import {
  fetchHostedCurriculum,
  publicDownloadConfirmation,
} from "./official-curriculum";
import { remotePdfName } from "./collection-fetch";
import { CollectionService } from "./collection.service";
const id = "PublicCurriculumFile12345";
const source = `https://drive.google.com/uc?export=download&id=${id}&resourcekey=0-PublicKey`;
const page = (html: string) => ({
  url: source,
  type: "text/html",
  bytes: Buffer.from(html),
});
const form = (
  file = id,
  action = "https://drive.usercontent.google.com/download",
) =>
  `<html><h1>Google Drive cannot scan this file for viruses</h1><form id="download-form" action="${action}" method="get"><input type="hidden" name="id" value="${file}"><input type="hidden" name="export" value="download"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="public-download-uuid"><input type="hidden" name="authuser" value="0"><input type="submit" value="Download anyway"></form></html>`;
describe("Public document download handling", () => {
  it("follows a public confirmation for the same file and retains its public sharing key", async () => {
    const download = jest
      .fn()
      .mockResolvedValueOnce(page(form()))
      .mockResolvedValueOnce({
        url: "https://drive.usercontent.google.com/download",
        type: "application/pdf",
        bytes: Buffer.from("%PDF-test"),
        fileName: "Grade 7 English.pdf",
      });
    const result = await fetchHostedCurriculum(source, download);
    expect(result.fileName).toBe("Grade 7 English.pdf");
    const target = new URL(download.mock.calls[1][0]);
    expect(target.hostname).toBe("drive.usercontent.google.com");
    expect(target.searchParams.get("id")).toBe(id);
    expect(target.searchParams.get("confirm")).toBe("t");
    expect(target.searchParams.get("resourcekey")).toBe("0-PublicKey");
    expect(download).toHaveBeenCalledTimes(2);
  });
  it("uses the public binary endpoint and can complete its explicit confirmation", async () => {
    const download = jest
      .fn()
      .mockResolvedValueOnce(page("<h1>Google Drive</h1>"))
      .mockResolvedValueOnce(page(form()))
      .mockResolvedValueOnce({
        url: source,
        type: "application/pdf",
        bytes: Buffer.from("%PDF-test"),
      });
    await expect(
      fetchHostedCurriculum(source, download),
    ).resolves.toHaveProperty("type", "application/pdf");
    expect(new URL(download.mock.calls[1][0]).pathname).toBe("/download");
    expect(download).toHaveBeenCalledTimes(3);
  });
  it.each([
    ["<h1>You need access. Request access.</h1>", "sharing permission"],
    ["<h1>Sign in to continue</h1>", "sign-in"],
    [
      "<h1>Too many users have viewed or downloaded this file recently.</h1>",
      "limiting public downloads",
    ],
  ])(
    "distinguishes access restrictions and quota pages without retrying private access (%s)",
    async (html, message) => {
      const download = jest.fn().mockResolvedValue(page(html));
      await expect(fetchHostedCurriculum(source, download)).rejects.toThrow(
        message,
      );
      expect(download).toHaveBeenCalledTimes(1);
    },
  );
  it("does not execute scripts, follow a different file, send POST forms or accept arbitrary destinations", () => {
    for (const html of [
      form("DifferentFile12345"),
      form(id, "https://evil.test/download"),
      form().replace('method="get"', 'method="post"'),
      form().replace('value="0"', 'value="1"'),
      `<script>fetch('https://evil.test')</script>`,
    ])
      expect(publicDownloadConfirmation(html, source)).toBeUndefined();
  });
  it("accepts a literal same-file confirmation link and rejects query injection", () => {
    expect(
      publicDownloadConfirmation(
        `<a href="https://drive.google.com/uc?export=download&amp;id=${id}&amp;confirm=token">Download anyway</a>`,
        source,
      ),
    ).toContain("confirm=token");
    expect(
      publicDownloadConfirmation(
        `<a href="https://drive.google.com/uc?export=download&amp;id=${id}&amp;confirm=token&amp;redirect=https://evil.test">Download</a>`,
        source,
      ),
    ).toBeUndefined();
  });
  it("bounds repeated confirmation pages and never returns them as PDF bytes", async () => {
    const download = jest.fn().mockResolvedValue(page(form()));
    await expect(fetchHostedCurriculum(source, download)).rejects.toThrow(
      "did not return a PDF",
    );
    expect(download.mock.calls.length).toBeLessThanOrEqual(3);
  });
  it("extracts safe PDF filenames from response headers rather than displaying uc", () => {
    expect(
      remotePdfName("attachment; filename*=UTF-8''Grade%207%20English.pdf"),
    ).toBe("Grade 7 English.pdf");
    expect(remotePdfName('attachment; filename="../../Maths.pdf"')).toBe(
      "Maths.pdf",
    );
    expect(remotePdfName('attachment; filename="login.html"')).toBeUndefined();
    expect(
      remotePdfName("attachment; filename*=UTF-8''%XX.pdf"),
    ).toBeUndefined();
  });
  it("requeues failed assets atomically and skips jobs already retried", async () => {
    let retried = false;
    const tx = {
      collectionAsset: {
        findFirst: jest.fn().mockResolvedValue({ id: "a", status: "FAILED" }),
        updateMany: jest.fn(),
      },
      contentLibraryJob: {
        findFirst: jest.fn().mockResolvedValue({ id: "job" }),
        updateMany: jest
          .fn()
          .mockImplementation(() => ({
            count: retried ? 0 : ((retried = true), 1),
          })),
      },
    };
    const prisma = { $transaction: jest.fn().mockImplementation((f) => f(tx)) };
    const service = new CollectionService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(await service.retryAssets(["a"], { id: 42 } as any)).toEqual({
      queued: 1,
      skipped: 0,
    });
    expect(tx.contentLibraryJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job", status: "FAILED" },
      data: { status: "QUEUED", error: null, createdById: 42 },
    });
    expect(await service.retryAssets(["a"], { id: 42 } as any)).toEqual({
      queued: 0,
      skipped: 1,
    });
    expect(tx.collectionAsset.updateMany).toHaveBeenCalledTimes(1);
  });
});
