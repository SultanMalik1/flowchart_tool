import {
  deleteFlowchart,
  getFlowchart,
  updateFlowchart,
} from '@/lib/local-flowchart-store';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateFlowchartSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  thumbnail: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

const notFound = (): NextResponse =>
  NextResponse.json({ error: 'Flowchart not found' }, { status: 404 });

const serverError = (): NextResponse =>
  NextResponse.json({ error: 'Internal server error' }, { status: 500 });

// GET /api/flowcharts/[id] - Get one flowchart
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const flowchart = await getFlowchart(id);
    return flowchart ? NextResponse.json(flowchart) : notFound();
  } catch (error) {
    console.error('Error fetching flowchart:', error);
    return serverError();
  }
}

// PUT /api/flowcharts/[id] - Update a flowchart
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const data = updateFlowchartSchema.parse(await request.json());
    const updated = await updateFlowchart(id, data);
    return updated
      ? NextResponse.json({
          success: true,
          message: 'Flowchart updated successfully',
        })
      : notFound();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating flowchart:', error);
    return serverError();
  }
}

// DELETE /api/flowcharts/[id] - Delete a flowchart
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    return (await deleteFlowchart(id))
      ? NextResponse.json({
          success: true,
          message: 'Flowchart deleted successfully',
        })
      : notFound();
  } catch (error) {
    console.error('Error deleting flowchart:', error);
    return serverError();
  }
}
