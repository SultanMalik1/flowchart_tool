import { expect, it } from 'vitest';
import { type DrawioDocument, EMPTY_DRAWIO_XML } from './contracts';
import { commandHasVisibleShapes } from './visible-command';

const document: DrawioDocument = {
  editorKind: 'drawio',
  formatVersion: 1,
  documentId: 'doc-1',
  revision: 1,
  diagramType: 'flowchart',
  xml: EMPTY_DRAWIO_XML,
};

const shaped = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" parent="1" vertex="1" value="Start"><mxGeometry x="0" y="0" width="180" height="56" as="geometry"/></mxCell></root></mxGraphModel>`;

it('rejects a create that has no visible shape and accepts one that does', () => {
  expect(
    commandHasVisibleShapes(document, {
      kind: 'drawio-command',
      commandId: 'command-1',
      documentId: 'doc-1',
      baseRevision: 1,
      operation: 'create',
      diagramType: 'flowchart',
      description: 'Empty',
      xml: EMPTY_DRAWIO_XML,
    })
  ).toBe(false);
  expect(
    commandHasVisibleShapes(document, {
      kind: 'drawio-command',
      commandId: 'command-2',
      documentId: 'doc-1',
      baseRevision: 1,
      operation: 'create',
      diagramType: 'flowchart',
      description: 'Start',
      xml: shaped,
    })
  ).toBe(true);
});
