import type { PhotoKind } from '../../../shared/protocol';
import { PostIt } from '../../components/Paper';
import { RubberStamp } from '../../components/RubberStamp';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/**
 * Shown only to the photo's owner: a pink post-it slapped over the corner of the print, a
 * "Top secret" rubber stamp, "That's YOUR mom!" in bold and the bluffing advice in ballpoint.
 */
export function MineBanner({ kind, className }: { kind: PhotoKind; className?: string }) {
  const t = useT();
  return (
    <div role="status" className={cn('relative', className)}>
      <PostIt color="pink" tilt={-1.6} slap={0.25} tape="yellow" lift className="pt-4 pr-4 pb-2.5 pl-3.5">
        <p className="font-display text-[1.3rem] leading-[1.02] tracking-[-0.02em] sm:text-[1.6rem]">{t(`voting.mine.title.${kind}`)}</p>
        {/* Small phones: the title alone (the note under the cards already says "vote for someone else"). */}
        <p className="text-pen mt-1 text-[1.15rem] leading-[1.02] max-[359px]:hidden [@media(max-height:700px)]:hidden">{t('voting.mine.body')}</p>
      </PostIt>
      {/* Outside the post-it: its torn edge clips what it holds. */}
      <RubberStamp size={13} tilt={6} animate={0.55} className="absolute -top-3 right-3 z-10">
        {t('voting.mine.tag')}
      </RubberStamp>
    </div>
  );
}
