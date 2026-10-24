import {
  createFlowchart,
  listFlowcharts,
} from '@/lib/local-flowchart-store';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const createFlowchartSchema = z.object({
  title: z.string().optional().default('Untitled'),
  content: z.string().min(1, 'Content is required'),
  thumbnail: z.string().optional(),
});

// GET /api/flowcharts - List saved flowcharts
export async function GET(): Promise<NextResponse> {
  try {
    const flowcharts = await listFlowcharts();
    return NextResponse.json({ flowcharts });
  } catch (error) {
    console.error('Error fetching flowcharts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/flowcharts - Create a flowchart (empty body pre-creates one)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));

    if (!body.content) {
      const created = await createFlowchart({});
      return NextResponse.json(
        { id: created.id, preCreated: true },
        { status: 201 }
      );
    }

    const data = createFlowchartSchema.parse(body);
    const created = await createFlowchart(data);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating flowchart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
