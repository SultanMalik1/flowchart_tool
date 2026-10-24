/**
 * Local, file-based flowchart storage.
 *
 * Replaces the former database layer so the app runs with no external
 * services. Every flowchart is one JSON file under `.data/flowcharts`
 * (override the folder with FLOWCHART_DATA_DIR).
 */
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface StoredFlowchart {
  id: string;
  title: string;
  content: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowchartInput {
  title?: string;
  content?: string;
  thumbnail?: string | null;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

/** Empty content opens the native draw.io editor. */
export const EMPTY_FLOWCHART_CONTENT =
  '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}';

function dataDir(): string {
  return (
    process.env.FLOWCHART_DATA_DIR ||
    path.join(process.cwd(), '.data', 'flowcharts')
  );
}

function fileFor(id: string): string | null {
  return ID_PATTERN.test(id) ? path.join(dataDir(), `${id}.json`) : null;
}

async function readRecord(file: string): Promise<StoredFlowchart | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as StoredFlowchart;
  } catch {
    return null;
  }
}

async function writeRecord(record: StoredFlowchart): Promise<void> {
  const file = fileFor(record.id);
  if (!file) throw new Error('Invalid flowchart id');
  await fs.mkdir(dataDir(), { recursive: true });
  // Write to a temp file first so a crash cannot leave a truncated diagram.
  const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(temp, JSON.stringify(record), 'utf8');
  await fs.rename(temp, file);
}

export function newFlowchartId(): string {
  return `flowchart_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

export async function listFlowcharts(): Promise<StoredFlowchart[]> {
  let names: string[];
  try {
    names = await fs.readdir(dataDir());
  } catch {
    return [];
  }
  const records = await Promise.all(
    names
      .filter((name) => name.endsWith('.json'))
      .map((name) => readRecord(path.join(dataDir(), name)))
  );
  return records
    .filter((record): record is StoredFlowchart => record !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getFlowchart(
  id: string
): Promise<StoredFlowchart | null> {
  const file = fileFor(id);
  return file ? readRecord(file) : null;
}

export async function createFlowchart(
  input: FlowchartInput
): Promise<StoredFlowchart> {
  const now = new Date().toISOString();
  const record: StoredFlowchart = {
    id: newFlowchartId(),
    title: input.title || 'Untitled',
    content: input.content || EMPTY_FLOWCHART_CONTENT,
    thumbnail: input.thumbnail ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await writeRecord(record);
  return record;
}

export async function updateFlowchart(
  id: string,
  input: FlowchartInput
): Promise<StoredFlowchart | null> {
  const existing = await getFlowchart(id);
  if (!existing) return null;
  const record: StoredFlowchart = {
    ...existing,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
    updatedAt: new Date().toISOString(),
  };
  await writeRecord(record);
  return record;
}

export async function deleteFlowchart(id: string): Promise<boolean> {
  const file = fileFor(id);
  if (!file) return false;
  try {
    await fs.unlink(file);
    return true;
  } catch {
    return false;
  }
}
