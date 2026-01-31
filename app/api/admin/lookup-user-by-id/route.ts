import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const regularSupabase = await createClient();

  // Verify admin access
  const { data: { user } } = await regularSupabase.auth.getUser();
  const adminUserId = process.env.ADMIN_USER_ID;

  if (adminUserId && (!user || user.id !== adminUserId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID parameter is required' },
      { status: 400 }
    );
  }

  try {
    const adminSupabase = createAdminClient();

    // Look up user by ID using admin API
    const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

    if (error) {
      throw error;
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user_id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
      must_change_password: data.user.user_metadata?.must_change_password || false,
    });
  } catch (error: any) {
    console.error('Error looking up user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to look up user' },
      { status: 500 }
    );
  }
}
