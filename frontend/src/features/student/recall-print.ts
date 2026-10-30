/** Print a rendered card in its own document without exposing other page content. */
export async function printRecallSheet(sheet: HTMLElement, title: string) {
  const frame = document.createElement("iframe");
  frame.title = "Printable revision card";
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!,
      win = frame.contentWindow!;
    doc.title = title;
    const styles = [
      ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ].map((link) => {
      const copy = link.cloneNode(true) as HTMLLinkElement;
      const loaded = new Promise<void>((resolve) => {
        copy.onload = () => resolve();
        copy.onerror = () => resolve();
      });
      doc.head.appendChild(copy);
      return loaded;
    });
    for (const style of document.querySelectorAll("style"))
      doc.head.appendChild(style.cloneNode(true));
    const printStyle = doc.createElement("style");
    printStyle.textContent =
      "@page{size:A4 landscape;margin:5mm}html{font-size:14px}html,body{margin:0;background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}[data-revision-card]{box-shadow:none!important;width:100%;break-inside:avoid;zoom:.92}.recall-diagram{max-height:80mm}";
    doc.head.appendChild(printStyle);
    doc.body.appendChild(sheet.cloneNode(true));
    await Promise.race([
      Promise.all(styles),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    await Promise.all(
      [...doc.images].map((img) => img.decode?.().catch(() => undefined)),
    );
    await Promise.all(
      [...doc.querySelectorAll<SVGImageElement>("svg image")].map(
        (image) =>
          new Promise<void>((resolve) => {
            const asset = doc.createElement("img");
            asset.onload = () => resolve();
            asset.onerror = () => resolve();
            asset.src = new URL(
              image.getAttribute("href") ?? "",
              document.baseURI,
            ).href;
          }),
      ),
    );
    await doc.fonts?.ready;
    win.focus();
    win.print();
  } finally {
    // Retain the frame briefly for browsers that render the print preview asynchronously.
    setTimeout(() => frame.remove(), 60000);
  }
}
