import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register
router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
  }

  const { email, password, name } = result.data;

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split('@')[0] },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw authError;
    }

    // Create user profile in database using Prisma
    let profile;
    try {
      profile = await prisma.user.create({
        data: {
          id: authData.user.id,
          email: authData.user.email || email,
          name: name || email.split('@')[0],
          role: 'USER',
        },
      });

      // Create default preferences
      await prisma.userPreferences.create({
        data: { userId: authData.user.id },
      });
    } catch (dbError) {
      console.error('Database profile creation error:', dbError);
      // Clean up the auth user since profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Sign in to get proper session with access token
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('Sign in after registration failed:', signInError);
      return res.status(500).json({ error: 'Registration succeeded but login failed. Please log in manually.' });
    }

    res.status(201).json({
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        name: name || email.split('@')[0],
      },
      token: signInData.session.access_token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
  }

  const { email, password } = result.data;

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Ensure Prisma user profile exists (create if missing)
    let profile = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!profile) {
      profile = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0],
          role: 'USER',
        },
      });

      // Create default preferences
      await prisma.userPreferences.create({
        data: { userId: data.user.id },
      });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email || email,
        name: profile.name,
      },
      token: data.session.access_token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user!.id },
    });

    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: profile?.name,
        role: profile?.role,
        avatarUrl: profile?.avatarUrl,
        preferences,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side only, but we can blacklist token if needed)
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// Update profile
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { name, avatarUrl } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ name, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update preferences
router.put('/preferences', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { theme, currency, dateFormat, language, weeklyStartDay, notificationsEnabled, emailReports } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: req.user!.id,
        theme,
        currency,
        date_format: dateFormat,
        language,
        weekly_start_day: weeklyStartDay,
        notifications_enabled: notificationsEnabled,
        email_reports: emailReports,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ preferences: data });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;