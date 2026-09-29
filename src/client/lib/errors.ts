import type { I18n } from '../i18n';
import type { ClientError } from './store';

/** Human message for an error code. */
export function errorText(t: I18n['t'], error: ClientError | 'UNREADABLE_IMAGE'): string {
  return t(`errors.${error}`);
}
