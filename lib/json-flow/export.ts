import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type ImageExportFormat = "png" | "jpeg";
export type ExportFormat = ImageExportFormat | "pdf";

export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;
export const EXPORT_PADDING = 0.15;

export interface ExportViewport {
  x: number;
  y: number;
  zoom: number;
}

function captureViewport(format: ImageExportFormat, viewportEl: HTMLElement, viewport: ExportViewport) {
  const capture = format === "png" ? toPng : toJpeg;
  return capture(viewportEl, {
    backgroundColor: format === "jpeg" ? "#ffffff" : "#f8fafc",
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    pixelRatio: 2,
    style: {
      width: `${EXPORT_WIDTH}px`,
      height: `${EXPORT_HEIGHT}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", filename);
  link.click();
}

/** Rasterizes the flow's viewport element and downloads it as a PNG or JPEG file. */
export async function downloadDiagramImage(
  format: ImageExportFormat,
  viewportEl: HTMLElement,
  viewport: ExportViewport,
  filename: string,
) {
  const dataUrl = await captureViewport(format, viewportEl, viewport);
  triggerDownload(dataUrl, filename);
}

/** Rasterizes the flow's viewport element and embeds it into a single-page PDF. */
export async function downloadDiagramPdf(
  viewportEl: HTMLElement,
  viewport: ExportViewport,
  filename: string,
) {
  const dataUrl = await captureViewport("png", viewportEl, viewport);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [EXPORT_WIDTH, EXPORT_HEIGHT],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  pdf.save(filename);
}
