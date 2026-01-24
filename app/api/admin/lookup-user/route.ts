import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const regularSupabase = await createClient();

  // Check if user is already admin OR if no admin is set yet (initial setup)
  const { data: { user } } = await regularSupabase.auth.getUser();

  // Allow if user is admin OR if ADMIN_USER_ID is not set (first-time setup)
  const adminUserId = process.env.ADMIN_USER_ID;
  if (adminUserId && (!user || user.id !== adminUserId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  try {
    const adminSupabase = createAdminClient();

    // Look up user by email using admin API
    const { data, error } = await adminSupabase.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    const foundUser = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user_id: foundUser.id,
      email: foundUser.email,
      created_at: foundUser.created_at,
    });
  } catch (error: any) {
    console.error('Error looking up user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to look up user' },
      { status: 500 }
    );
  }
}
