'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';

export type HQSidebarTab =
  | 'inbox'
  | 'history'
  | 'playbooks'
  | 'marketplace'
  | 'analytics';

type HQSidebarProps = {
  open: boolean;
  activeTab: HQSidebarTab;
  inboxCount: number;
  onToggle: () => void;
  onTabChange: (tab: HQSidebarTab) => void;
  inboxPanel: ReactNode;
  historyPanel: ReactNode;
  playbooksPanel: ReactNode;
  marketplacePanel: ReactNode;
  analyticsPanel: ReactNode;
};

const PRIMARY_TABS: HQSidebarTab[] = ['inbox', 'history', 'playbooks'];

export function HQSidebar({
  open,
  activeTab,
  inboxCount,
  onToggle,
  onTabChange,
  inboxPanel,
  historyPanel,
  playbooksPanel,
  marketplacePanel,
  analyticsPanel,
}: HQSidebarProps) {
  const { t } = useI18n();
  const analyticsOnly = activeTab === 'analytics';
  const marketplaceOnly = activeTab === 'marketplace';
  const railOnly = analyticsOnly || marketplaceOnly;
  const tabLabels: Record<HQSidebarTab, string> = {
    inbox: t('sidebar.tab.inbox'),
    history: t('sidebar.tab.history'),
    playbooks: t('sidebar.tab.playbooks'),
    marketplace: t('sidebar.tab.marketplace'),
    analytics: t('sidebar.tab.analytics'),
  };
  const activePanel =
    activeTab === 'inbox'
      ? inboxPanel
      : activeTab === 'history'
        ? historyPanel
        : activeTab === 'playbooks'
          ? playbooksPanel
          : activeTab === 'marketplace'
            ? marketplacePanel
            : analyticsPanel;

  return (
    <aside className="pointer-events-none fixed inset-y-0 right-0 z-20 flex justify-end">
      <div className="pointer-events-auto mt-14 flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-l-md border border-r-0 border-cyan-500/30 bg-[#06090d]/90 px-1.5 py-2.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-300 shadow-xl backdrop-blur transition-colors hover:border-cyan-400/50 hover:text-cyan-100"
          aria-expanded={open}
          aria-label={
            open ? t('sidebar.aria.collapseHq') : t('sidebar.aria.openHq')
          }
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            {open ? t('sidebar.collapseHq') : t('sidebar.openHq')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onTabChange('marketplace');
            if (!open) {
              onToggle();
            }
          }}
          className={`rounded-l-md border border-r-0 px-1.5 py-2.5 font-mono text-[10px] font-semibold tracking-[0.2em] shadow-xl backdrop-blur transition-colors ${
            marketplaceOnly
              ? 'border-fuchsia-400/50 bg-[#16081b]/95 text-fuchsia-100'
              : 'border-fuchsia-500/25 bg-[#100611]/90 text-fuchsia-300/80 hover:border-fuchsia-400/45 hover:text-fuchsia-100'
          }`}
          aria-pressed={marketplaceOnly}
          aria-label={t('sidebar.aria.openMarketplace')}
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            {t('sidebar.marketplace')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onTabChange('analytics');
            if (!open) {
              onToggle();
            }
          }}
          className={`rounded-l-md border border-r-0 px-1.5 py-2.5 font-mono text-[10px] font-semibold tracking-[0.2em] shadow-xl backdrop-blur transition-colors ${
            analyticsOnly
              ? 'border-amber-400/50 bg-[#1a1206]/95 text-amber-200'
              : 'border-amber-500/25 bg-[#120d06]/90 text-amber-300/80 hover:border-amber-400/45 hover:text-amber-100'
          }`}
          aria-pressed={analyticsOnly}
          aria-label={t('sidebar.aria.openAnalytics')}
        >
          <span className="block leading-none [writing-mode:vertical-rl]">
            {t('sidebar.analytics')}
          </span>
        </button>
      </div>

      {open ? (
        <div className="pointer-events-auto flex h-full w-56 flex-col border-l border-cyan-500/20 bg-black/85 shadow-2xl backdrop-blur">
          <div className="border-b border-cyan-500/15 px-4 py-3">
            <div className="font-mono text-[10px] font-semibold tracking-[0.32em] text-cyan-300/80">
              {analyticsOnly
                ? t('sidebar.analytics')
                : marketplaceOnly
                  ? t('sidebar.marketplace')
                  : t('sidebar.headquarters')}
            </div>
            <div className="mt-1 font-mono text-[11px] text-white/45">
              {analyticsOnly
                ? t('sidebar.analyticsDesc')
                : marketplaceOnly
                  ? t('sidebar.marketplaceDesc')
                  : t('sidebar.headquartersDesc')}
            </div>
            {railOnly ? (
              <button
                type="button"
                onClick={() => onTabChange('inbox')}
                className="mt-3 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
              >
                {t('sidebar.backToHq')}
              </button>
            ) : null}
          </div>

          {!railOnly ? (
            <div className="grid grid-cols-3 border-b border-cyan-500/15">
              {PRIMARY_TABS.map((tab) => {
                const isActive = tab === activeTab;
                const showBadge = tab === 'inbox' && inboxCount > 0;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onTabChange(tab)}
                    className={`flex items-center justify-center gap-1 border-r border-cyan-500/10 px-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors last:border-r-0 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-100'
                        : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <span>{tabLabels[tab]}</span>
                    {showBadge ? (
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
                        {inboxCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">{activePanel}</div>
        </div>
      ) : null}
    </aside>
  );
}
