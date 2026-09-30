export const SPECIALIZATIONS = [
  'Photographer',
  'Videographer',
  'DJ',
  'Musician',
  'Vocalist',
  'Dancer',
  'MC / Host',
  'Comedian',
  'Makeup Artist',
  'Lighting Designer',
  'Sound Engineer',
  'Stylist',
] as const;

export const GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'] as const;

export const EVENT_CATEGORIES = ['Music', 'Fashion', 'Corporate', 'Festival', 'Wedding', 'Film & Media', 'Theatre & Dance', 'Nightlife', 'Other'] as const;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE = 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter and a number.';
export const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
