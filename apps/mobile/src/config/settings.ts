import { z } from 'zod';
import rawSettings from '../../appsettings.json';

export const settingsSchema = z.object({
  dataMode: z.enum(['offline', 'online']),
  defaultLanguage: z.enum(['tr', 'en', 'system']),
  supabase: z.object({ url: z.string(), publishableKey: z.string() }),
  network: z.object({ timeoutMs: z.number().int().min(1000).max(60000) }),
  demo: z.object({ defaultPersona: z.enum(['parent', 'teacher']) }),
});
export const settings = settingsSchema.parse(rawSettings);
