import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function generateTemporaryPassword(): string {
  // Generate a random 12-character password with letters and numbers
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  const regularSupabase = await createClient();

  // Verify admin access
  const { data: { user } } = await regularSupabase.auth.getUser();
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!adminUserId || !user || user.id !== adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Generate a temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Update the user's password and set metadata flag
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      user_metadata: {
        must_change_password: true,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      temporaryPassword,
      message: 'Temporary password generated. User must change it on next login.',
    });
  } catch (error: any) {
    console.error('Error resetting user password:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset user password' },
      { status: 500 }
    );
  }
}
