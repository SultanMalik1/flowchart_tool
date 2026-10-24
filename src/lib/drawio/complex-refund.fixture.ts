import type { DrawioDocument } from './contracts';

const groups = ['customer', 'support', 'manager', 'finance', 'payment'];
const steps = [
  ['request', 'Submit refund request', 'customer'],
  ['validate', 'Validate order', 'support'],
  ['valid', 'Order valid?', 'support'],
  ['expiry', 'Within refund window?', 'support'],
  ['exception', 'Exception review', 'manager'],
  ['exception_ok', 'Exception approved?', 'manager'],
  ['evidence', 'Check evidence', 'support'],
  ['sufficient', 'Evidence complete?', 'support'],
  ['supplement', 'Submit more evidence', 'customer'],
  ['fork', 'Parallel review', 'support'],
  ['supervisor', 'Supervisor review', 'manager'],
  ['approved', 'Supervisor approved?', 'manager'],
  ['calculate', 'Finance calculation', 'finance'],
  ['correct', 'Amount correct?', 'finance'],
  ['correction', 'Correct amount', 'finance'],
  ['join', 'Both reviews passed', 'support'],
  ['refund', 'Request refund', 'payment'],
  ['paid', 'Refund successful?', 'payment'],
  ['retry', 'Retry refund', 'retry_group'],
  ['manual', 'Manual handling', 'payment'],
  ['notify', 'Notify customer', 'support'],
  ['archive', 'Archive', 'support'],
  ['reject', 'Reject request', 'support'],
];
const connections = [
  ['request', 'validate'],
  ['validate', 'valid'],
  ['valid', 'expiry'],
  ['valid', 'reject'],
  ['expiry', 'exception'],
  ['expiry', 'evidence'],
  ['exception', 'exception_ok'],
  ['exception_ok', 'evidence'],
  ['exception_ok', 'reject'],
  ['evidence', 'sufficient'],
  ['sufficient', 'supplement'],
  ['supplement', 'evidence'],
  ['sufficient', 'fork'],
  ['fork', 'supervisor'],
  ['fork', 'calculate'],
  ['supervisor', 'approved'],
  ['approved', 'join'],
  ['approved', 'reject'],
  ['calculate', 'correct'],
  ['correct', 'join'],
  ['correct', 'correction'],
  ['correction', 'calculate'],
  ['join', 'refund'],
  ['refund', 'paid'],
  ['paid', 'notify'],
  ['paid', 'retry'],
  ['retry', 'refund'],
  ['paid', 'manual'],
  ['manual', 'notify'],
  ['notify', 'archive'],
];

export function complexRefundFixture(): DrawioDocument {
  const counters: Record<string, number> = {};
  const groupXml = groups
    .map(
      (id, i) =>
        `<mxCell id="${id}" value="${id}" style="swimlane;horizontal=1;" vertex="1" parent="1"><mxGeometry x="${i * 280}" y="0" width="260" height="1200" as="geometry"/></mxCell>`
    )
    .join('');
  const nested =
    '<mxCell id="retry_group" value="Retry subprocess" style="swimlane;" vertex="1" parent="payment"><mxGeometry x="10" y="720" width="230" height="200" as="geometry"/></mxCell>';
  const nodeXml = steps
    .map(([id, label, parent]) => {
      const rank = counters[parent] || 0;
      counters[parent] = rank + 1;
      return `<mxCell id="${id}" value="${label}" style="rounded=1;fillColor=#ffffff;strokeColor=#536175;" vertex="1" parent="${parent}"><mxGeometry x="20" y="${50 + rank * 100}" width="200" height="56" as="geometry"/></mxCell>`;
    })
    .join('');
  const edges = connections
    .map(
      ([source, target], i) =>
        `<mxCell id="edge_${i}" edge="1" parent="1" source="${source}" target="${target}" style="edgeStyle=orthogonalEdgeStyle;endArrow=block;"><mxGeometry relative="1" as="geometry"/></mxCell>`
    )
    .join('');
  return {
    editorKind: 'drawio',
    formatVersion: 1,
    documentId: 'refund-fixture',
    revision: 4,
    diagramType: 'flowchart',
    xml: `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${groupXml}${nested}${nodeXml}${edges}</root></mxGraphModel>`,
  };
}
