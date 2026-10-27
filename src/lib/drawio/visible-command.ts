import { prepareDrawioCommand } from './command';
import type { DrawioCommand, DrawioDocument } from './contracts';
import { readNativeCells } from './native-document';

/** Create and replace must leave at least one visible editable shape. */
export function commandHasVisibleShapes(
  document: DrawioDocument,
  command: DrawioCommand
): boolean {
  if (command.operation === 'patch') return true;
  const prepared = prepareDrawioCommand(document, command);
  return readNativeCells(prepared).some(
    (cell) =>
      cell.parent &&
      cell.parent !== '0' &&
      Number(cell.geometry.width) > 0 &&
      Number(cell.geometry.height) > 0
  );
}
