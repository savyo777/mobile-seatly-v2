import type { User } from '@supabase/supabase-js';
import i18n from '@/lib/i18n';

type DisplayProfileFallback = {
  fullName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
};

export type DisplayProfile = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
};

function metadataString(user: User | null, key: string): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const value = meta[key];
  return typeof value === 'string' ? value.trim() : '';
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: i18n.t('common.fallbackUser'), lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function resolveAuthDisplayProfile(
  user: User | null,
  fallback: DisplayProfileFallback = {},
): DisplayProfile {
  const email = (user?.email ?? fallback.email ?? '').trim();
  const phone =
    (user?.phone ?? '').trim() ||
    metadataString(user, 'phone') ||
    (fallback.phone ?? '').trim();
  const fullName =
    metadataString(user, 'full_name') ||
    metadataString(user, 'name') ||
    metadataString(user, 'display_name') ||
    [metadataString(user, 'first_name'), metadataString(user, 'last_name')]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    (fallback.fullName ?? '').trim() ||
    (email ? email.split('@')[0] : '') ||
    i18n.t('common.fallbackUser');
  const avatarUrl =
    metadataString(user, 'avatar_url') ||
    metadataString(user, 'picture') ||
    fallback.avatarUrl ||
    null;
  const { firstName, lastName } = splitName(fullName);

  return {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    avatarUrl,
  };
}

export function initialsFromDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  const first = parts[0] ?? i18n.t('common.fallbackUser');
  return first.slice(0, 2).toUpperCase();
}

export function compactNameLabel(fullName: string): string {
  const { firstName, lastName } = splitName(fullName);
  return lastName ? `${firstName} ${lastName[0].toUpperCase()}.` : firstName;
}

