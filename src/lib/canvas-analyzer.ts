// ExcalidrawElement type - using any since it's not easily accessible from exports
export type ExcalidrawElement = any;

export interface CanvasAnalysis {
  totalElements: number;
  elementsByType: Record<string, number>;
  spatialLayout: SpatialLayout;
  connections: Connection[];
  textContent: TextContent[];
  canvasDescription: string;
}

export interface SpatialLayout {
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  elementGroups: ElementGroup[];
}

export interface ElementGroup {
  elements: string[]; // element IDs
  center: { x: number; y: number };
  description: string;
}

export interface Connection {
  from: string; // element ID
  to: string; // element ID
  type: 'arrow' | 'line';
  description: string;
}

export interface TextContent {
  elementId: string;
  text: string;
  position: { x: number; y: number };
  elementType: string;
}

export interface ElementInfo {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  text?: string;
  style: {
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
  };
}

export function analyzeCanvasElements(
  elements: ExcalidrawElement[]
): CanvasAnalysis {
  const elementsByType = groupElementsByType(elements);
  const spatialLayout = analyzeSpatialLayout(elements);
  const connections = analyzeConnections(elements);
  const textContent = extractAllTextContent(elements);

  const canvasDescription = generateCanvasDescription({
    totalElements: elements.length,
    elementsByType,
    spatialLayout,
    connections,
    textContent,
    canvasDescription: '', // Will be filled by generateCanvasDescription
  });

  return {
    totalElements: elements.length,
    elementsByType,
    spatialLayout,
    connections,
    textContent,
    canvasDescription,
  };
}

function groupElementsByType(
  elements: ExcalidrawElement[]
): Record<string, number> {
  const groups: Record<string, number> = {};

  for (const element of elements) {
    if (!element.isDeleted) {
      groups[element.type] = (groups[element.type] || 0) + 1;
    }
  }

  return groups;
}

function analyzeSpatialLayout(elements: ExcalidrawElement[]): SpatialLayout {
  const activeElements = elements.filter((el) => !el.isDeleted);

  if (activeElements.length === 0) {
    return {
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      elementGroups: [],
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of activeElements) {
    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + (element.width || 0));
    maxY = Math.max(maxY, element.y + (element.height || 0));
  }

  const boundingBox = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };

  const elementGroups = identifyElementGroups(activeElements);

  return {
    boundingBox,
    elementGroups,
  };
}

function identifyElementGroups(elements: ExcalidrawElement[]): ElementGroup[] {
  const groups: ElementGroup[] = [];
  const visited = new Set<string>();

  for (const element of elements) {
    if (visited.has(element.id)) continue;

    const group = findNearbyElements(element, elements, visited);
    if (group.length > 0) {
      const center = calculateGroupCenter(group);
      const description = generateGroupDescription(group);

      groups.push({
        elements: group.map((el) => el.id),
        center,
        description,
      });
    }
  }

  return groups;
}

function findNearbyElements(
  centerElement: ExcalidrawElement,
  allElements: ExcalidrawElement[],
  visited: Set<string>,
  maxDistance = 200
): ExcalidrawElement[] {
  const group = [centerElement];
  visited.add(centerElement.id);

  const centerX = centerElement.x + (centerElement.width || 0) / 2;
  const centerY = centerElement.y + (centerElement.height || 0) / 2;

  for (const element of allElements) {
    if (visited.has(element.id)) continue;

    const elementX = element.x + (element.width || 0) / 2;
    const elementY = element.y + (element.height || 0) / 2;

    const distance = Math.sqrt(
      (elementX - centerX) ** 2 + (elementY - centerY) ** 2
    );

    if (distance <= maxDistance) {
      group.push(element);
      visited.add(element.id);
    }
  }

  return group;
}

function calculateGroupCenter(elements: ExcalidrawElement[]): {
  x: number;
  y: number;
} {
  let totalX = 0;
  let totalY = 0;

  for (const element of elements) {
    totalX += element.x + (element.width || 0) / 2;
    totalY += element.y + (element.height || 0) / 2;
  }

  return {
    x: totalX / elements.length,
    y: totalY / elements.length,
  };
}

function generateGroupDescription(elements: ExcalidrawElement[]): string {
  const types = [...new Set(elements.map((el) => el.type))];
  const hasText = elements.some(
    (el) => ('text' in el && el.text) || ('label' in el && el.label?.text)
  );

  let description = `Group of ${elements.length} elements (${types.join(', ')})`;

  if (hasText) {
    description += ' with text content';
  }

  return description;
}

function analyzeConnections(elements: ExcalidrawElement[]): Connection[] {
  const connections: Connection[] = [];

  for (const element of elements) {
    if (element.isDeleted) continue;

    if (element.type === 'arrow' || element.type === 'line') {
      const connection = analyzeLineConnection(element, elements);
      if (connection) {
        connections.push(connection);
      }
    }
  }

  return connections;
}

function analyzeLineConnection(
  lineElement: ExcalidrawElement,
  allElements: ExcalidrawElement[]
): Connection | null {
  const startBinding =
    'startBinding' in lineElement ? lineElement.startBinding : null;
  const endBinding =
    'endBinding' in lineElement ? lineElement.endBinding : null;

  if (startBinding?.elementId && endBinding?.elementId) {
    const fromElement = allElements.find(
      (el) => el.id === startBinding.elementId
    );
    const toElement = allElements.find((el) => el.id === endBinding.elementId);

    if (fromElement && toElement) {
      const fromText = extractElementText(fromElement);
      const toText = extractElementText(toElement);

      return {
        from: startBinding.elementId,
        to: endBinding.elementId,
        type: lineElement.type as 'arrow' | 'line',
        description: `${lineElement.type} from "${fromText || fromElement.type}" to "${toText || toElement.type}"`,
      };
    }
  }

  return null;
}

function extractAllTextContent(elements: ExcalidrawElement[]): TextContent[] {
  const textContent: TextContent[] = [];

  for (const element of elements) {
    if (element.isDeleted) continue;

    const text = extractElementText(element);
    if (text) {
      textContent.push({
        elementId: element.id,
        text,
        position: { x: element.x, y: element.y },
        elementType: element.type,
      });
    }
  }

  return textContent;
}

function extractElementText(element: ExcalidrawElement): string | null {
  if (element.type === 'text' && 'text' in element) {
    return element.text || null;
  }

  if ('label' in element && element.label?.text) {
    return element.label.text;
  }

  return null;
}

function generateCanvasDescription(analysis: CanvasAnalysis): string {
  if (analysis.totalElements === 0) {
    return 'The canvas is currently empty with no elements.';
  }

  const analysisData = {
    totalElements: analysis.totalElements,
    elementTypes: analysis.elementsByType,
    textContent: analysis.textContent.map((tc) => tc.text),
    connections: analysis.connections.length,
    connectionDetails: analysis.connections.map((conn) => conn.description),
    hasDecisionPoints: analysis.elementsByType.diamond > 0,
    hasProcessSteps: analysis.elementsByType.rectangle > 0,
    hasStartEndPoints: analysis.textContent.some((tc) =>
      ['start', 'begin', 'end', 'finish', 'complete'].some((keyword) =>
        tc.text.toLowerCase().includes(keyword)
      )
    ),
    canvasSize: {
      width: Math.round(analysis.spatialLayout.boundingBox.width),
      height: Math.round(analysis.spatialLayout.boundingBox.height),
    },
  };

  let description = `Canvas contains ${analysis.totalElements} elements. `;

  const elementTypes = Object.entries(analysis.elementsByType)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');
  description += `Element types: ${elementTypes}. `;

  if (analysis.textContent.length > 0) {
    const texts = analysis.textContent
      .slice(0, 8)
      .map((tc) => `"${tc.text}"`)
      .join(', ');
    description += `Text content: ${texts}${analysis.textContent.length > 8 ? ' and more' : ''}. `;
  }

  if (analysis.connections.length > 0) {
    description += `Has ${analysis.connections.length} connections showing flow between elements. `;
  }

  if (analysisData.hasDecisionPoints) {
    description += 'Contains decision points for branching logic. ';
  }

  if (!analysisData.hasStartEndPoints && analysis.connections.length > 0) {
    description += 'Note: Could benefit from clear start/end points. ';
  }

  return description.trim();
}

export function generateAICanvasDescription(
  elements: ExcalidrawElement[]
): string {
  const analysis = analyzeCanvasElements(elements);
  return analysis.canvasDescription;
}
