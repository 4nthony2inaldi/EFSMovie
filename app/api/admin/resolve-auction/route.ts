import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuction } from '@/lib/auction';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { auctionId } = await request.json();

    if (!auctionId) {
      return NextResponse.json(
        { error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    const assignments = await resolveAuction(auctionId);

    return NextResponse.json({
      success: true,
      assignments: assignments.length,
    });
  } catch (error: any) {
    console.error('Error resolving auction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve auction' },
      { status: 500 }
    );
  }
}
