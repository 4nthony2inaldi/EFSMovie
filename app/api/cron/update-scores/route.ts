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
    // Check if any leagues have frozen scores
    const { data: activeLeagues } = await supabase
      .from('leagues')
      .select('id')
      .eq('status', 'active')
      .is('scores_frozen_at', null);

    if (!activeLeagues || activeLeagues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All leagues frozen',
        updated: 0,
      });
    }

    // Get movies that have released and need updating
    const today = new Date().toISOString().split('T')[0];
    const { data: movies } = await supabase
      .from('movies')
      .select('*')
      .lte('release_date', today)
      .order('release_date', { ascending: false })
      .limit(100);

    let updated = 0;
    const errors: string[] = [];

    // Note: In production, you would fetch actual data from APIs here
    // For now, this just recalculates scores based on current data
    for (const movie of movies || []) {
      try {
        // Trigger recalculation by updating with same values
        // The database trigger will recalculate the score
        await supabase
          .from('movies')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', movie.id);

        updated++;
      } catch (error: any) {
        errors.push(`${movie.title}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error updating scores:', error);
    return NextResponse.json(
      { error: 'Failed to update scores' },
      { status: 500 }
    );
  }
}
