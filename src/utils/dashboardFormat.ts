import JSZip from "jszip";
import { crc32 } from "./crc32";
import type { Manifest, Project } from "../types";

const MAGIC = new Uint8Array([0x4E,0x46,0x44,0x41,0x53,0x48,0x00,0x01]); // NFDASH\0\1
const HEADER_SIZE = 32;
const ZIP_OFFSET = 4096;

function writeU16LE(dv: DataView, off: number, v: number) { dv.setUint16(off, v, true); }
function writeU32LE(dv: DataView, off: number, v: number) { dv.setUint32(off, v >>> 0, true); }
function readU16LE(dv: DataView, off: number) { return dv.getUint16(off, true); }
function readU32LE(dv: DataView, off: number) { return dv.getUint32(off, true); }

export async function exportDashboard(project: Project, editorVersion = "0.1.0"): Promise<Blob> {
  const zip = new JSZip();

  const manifest: Manifest = {
    format: "nanoFIZ.dashboard",
    version: 1,
    createdUtc: new Date().toISOString(),
    app: { editor: "DashboardEditor", editorVersion },
    minViewerVersion: 1
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("project.json", JSON.stringify(project, null, 2));

  for (const s of project.screens) {
    zip.file(`screens/${s.id}.json`, JSON.stringify(s, null, 2));
  }

  const assetBytes: Record<string, Uint8Array> = (window as any).__assetBytes ?? {};
  for (const a of [...project.assets.images, ...project.assets.fonts]) {
    const b = assetBytes[a.id];
    if (b) zip.file(a.path, b);
  }

  const zipBytes = new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
  const zipCrc = crc32(zipBytes);

  const total = ZIP_OFFSET + zipBytes.length;
  const out = new Uint8Array(total);
  out.set(MAGIC, 0);

  const dv = new DataView(out.buffer);
  writeU16LE(dv, 0x08, HEADER_SIZE);
  writeU16LE(dv, 0x0A, 0);
  writeU32LE(dv, 0x0C, ZIP_OFFSET);
  writeU32LE(dv, 0x10, zipBytes.length);
  writeU32LE(dv, 0x14, zipCrc);
  writeU32LE(dv, 0x18, 0);
  writeU32LE(dv, 0x1C, 0);

  out.set(zipBytes, ZIP_OFFSET);
  return new Blob([out], { type: "application/octet-stream" });
}

export type ImportedDashboard = { manifest: Manifest; project: Project; screens: any[]; assetBytes: Record<string, Uint8Array> };

export async function importDashboard(fileBytes: Uint8Array): Promise<ImportedDashboard> {
  if (fileBytes.length < ZIP_OFFSET) throw new Error("File too small");
  for (let i = 0; i < 8; i++) if (fileBytes[i] !== MAGIC[i]) throw new Error("Bad magic / unsupported format");

  const dv = new DataView(fileBytes.buffer);
  const headerSize = readU16LE(dv, 0x08);
  const zipOffset  = readU32LE(dv, 0x0C);
  const zipSize    = readU32LE(dv, 0x10);
  const zipCrc     = readU32LE(dv, 0x14);

  if (headerSize !== HEADER_SIZE) throw new Error("Unsupported header size");
  if (zipOffset < headerSize || zipOffset + zipSize > fileBytes.length) throw new Error("Bad zip bounds");

  if (!(fileBytes[zipOffset] === 0x50 && fileBytes[zipOffset+1] === 0x4B && fileBytes[zipOffset+2] === 0x03 && fileBytes[zipOffset+3] === 0x04)) {
    throw new Error("Zip signature not found");
  }

  const zipBytes = fileBytes.slice(zipOffset, zipOffset + zipSize);
  if (crc32(zipBytes) !== zipCrc) throw new Error("CRC mismatch (corrupted)");

  const zip = await JSZip.loadAsync(zipBytes);

  const manifestStr = await zip.file("manifest.json")?.async("string");
  const projectStr  = await zip.file("project.json")?.async("string");
  if (!manifestStr || !projectStr) throw new Error("Missing manifest.json or project.json");

  const manifest = JSON.parse(manifestStr) as Manifest;
  const project  = JSON.parse(projectStr) as Project;
  if (manifest.format !== "nanoFIZ.dashboard" || manifest.version !== 1) throw new Error("Unsupported manifest");

  const screens: any[] = [];
  for (const s of project.screens) {
    const p = `screens/${s.id}.json`;
    const ss = await zip.file(p)?.async("string");
    if (!ss) throw new Error(`Missing screen file: ${p}`);
    screens.push(JSON.parse(ss));
  }

  const assetBytes: Record<string, Uint8Array> = {};
  for (const a of [...project.assets.images, ...project.assets.fonts]) {
    const f = zip.file(a.path);
    if (f) {
      const b = await f.async("uint8array");
      assetBytes[a.id] = new Uint8Array(b);
    }
  }

  return { manifest, project, screens, assetBytes };
}
