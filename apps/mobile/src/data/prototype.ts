import { z } from 'zod';
import { AppError } from '../domain/models';
import type { KeyValueStorage } from './offline';

const medicationSchema = z.object({ id: z.string(), childId: z.string(), name: z.string(), time: z.string(), note: z.string() });
const stateSchema = z.object({ medications: z.array(medicationSchema), reads: z.array(z.string()) });
export type Medication = z.infer<typeof medicationSchema>;
const key = 'kids-guide.demo.extras.v1';
/** Explicitly fictional, device-local demo records. Never used by connected accounts. */
export class PrototypeStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: KeyValueStorage) {}
  private run<T>(fn: (state: z.infer<typeof stateSchema>) => T, save = false): Promise<T> {
    const task = this.queue.then(async () => {
      try {
        const raw = await this.storage.getItem(key);
        const state = raw ? stateSchema.parse(JSON.parse(raw)) : { medications: [], reads: [] };
        const result = fn(state);
        if (save) await this.storage.setItem(key, JSON.stringify(state));
        return result;
      } catch (cause) { if (cause instanceof AppError) throw cause; throw new AppError('storage', { cause }); }
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
  medications(childId: string) { return this.run(state => state.medications.filter(row => row.childId === childId)); }
  addMedication(record: Medication) {
    if (!record.childId || !record.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)) return Promise.reject(new AppError('medicationInvalid'));
    return this.run(state => { state.medications.push({ ...record, name: record.name.trim(), note: record.note.trim() }); }, true);
  }
  hasRead(childId: string, contentId: string) { return this.run(state => state.reads.includes(`${childId}:${contentId}`)); }
  markRead(childId: string, contentId: string) { return this.run(state => { const id = `${childId}:${contentId}`; if (!state.reads.includes(id)) state.reads.push(id); }, true); }
  reset() { return this.run(state => { state.medications = []; state.reads = []; }, true); }
}
