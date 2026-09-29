import { createContext } from 'react';
import type { I18n } from './index';

/**
 * Lives apart from the dictionaries so that hot-reloading a strings file in dev does not
 * recreate the context (which would orphan every mounted consumer).
 */
export const I18nContext = createContext<I18n | null>(null);
