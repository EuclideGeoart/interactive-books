import { test } from '@playwright/test';

// Named steps are inert unless the timing reporter is selected; they retain normal assertions and traces.
export const timed = <T>(phase: string, action: () => Promise<T>): Promise<T> => test.step(`timing:${phase}`, action);
