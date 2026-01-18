import { NextRequest, NextResponse } from 'next/server';
import { checkAuctionStatuses } from '@/lib/auction';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAuctionStatuses();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error checking auctions:', error);
    return NextResponse.json(
      { error: 'Failed to check auctions' },
      { status: 500 }
    );
  }
}
