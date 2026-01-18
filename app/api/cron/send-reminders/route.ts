import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const now = new Date();
    const notifications: { type: string; count: number }[] = [];

    // Find open auctions closing in 1, 2, or 3 days
    const { data: openAuctions } = await supabase
      .from('auctions')
      .select('*, league:leagues(*)')
      .eq('status', 'open');

    for (const auction of openAuctions || []) {
      const closesAt = new Date(auction.closes_at);
      const daysUntilClose = Math.ceil(
        (closesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilClose > 0 && daysUntilClose <= 3) {
        // Get teams in this league
        const { data: teams } = await supabase
          .from('teams')
          .select('id, user_id')
          .eq('league_id', auction.league_id);

        // Check which teams haven't bid
        for (const team of teams || []) {
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id)
            .eq('team_id', team.id)
            .gt('amount', 0);

          if ((count || 0) === 0) {
            // Check if we already sent a reminder today
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const { count: alreadySent } = await supabase
              .from('notification_log')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', team.user_id)
              .eq('notification_type', `auction_reminder_${daysUntilClose}d`)
              .eq('reference_id', auction.id)
              .gte('sent_at', todayStart.toISOString());

            if ((alreadySent || 0) === 0) {
              // Log the notification (would send email in production)
              await supabase.from('notification_log').insert({
                user_id: team.user_id,
                notification_type: `auction_reminder_${daysUntilClose}d`,
                reference_id: auction.id,
              });

              // Note: In production, send email here using Resend
              // await sendAuctionReminder(team.user_id, auction, daysUntilClose);
            }
          }
        }

        notifications.push({
          type: `auction_reminder_${daysUntilClose}d`,
          count: teams?.length || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
