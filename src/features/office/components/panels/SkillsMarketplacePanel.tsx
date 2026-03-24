"use client";

import { useMemo, useState } from "react";

import {
  Download,
  ExternalLink,
  RefreshCcw,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

import type { OfficeSkillsMarketplaceController } from "@/features/office/hooks/useOfficeSkillsMarketplace";
import { useI18n } from "@/lib/i18n";
import type { SkillMarketplaceCollectionId, SkillMarketplaceEntry } from "@/lib/skills/marketplace";
import { buildSkillMarketplaceCollections } from "@/lib/skills/marketplace";
import { buildAgentSkillsAllowlistSet, deriveAgentSkillsAccessMode } from "@/lib/skills/presentation";

type MarketplaceFilter = "all" | SkillMarketplaceCollectionId;

const READINESS_CLASSES = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  "needs-setup": "border-amber-500/30 bg-amber-500/10 text-amber-100",
  unavailable: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  "disabled-globally": "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
} as const;

const formatRating = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "4.7";
  }
  return value.toFixed(1);
};

const formatInstalls = (value: number | undefined) => {
  const installs = value ?? 0;
  if (installs >= 1000) {
    return `${(installs / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US").format(installs);
};

const buildSearchBlob = (entry: SkillMarketplaceEntry): string => {
  return [
    entry.skill.name,
    entry.skill.description,
    entry.skill.skillKey,
    entry.skill.source,
    entry.metadata.category,
    entry.metadata.tagline,
    entry.metadata.capabilities.join(" "),
  ]
    .join(" ")
    .toLowerCase();
};

const getAgentSkillEnabled = (
  skillName: string,
  accessMode: ReturnType<typeof deriveAgentSkillsAccessMode>,
  allowlistSet: Set<string>
) => {
  if (accessMode === "all") {
    return true;
  }
  if (accessMode === "none") {
    return false;
  }
  return allowlistSet.has(skillName.trim());
};

export function SkillsMarketplacePanel({
  marketplace,
  onSelectAgent,
  onOpenAgentSettings,
}: {
  marketplace: OfficeSkillsMarketplaceController;
  onSelectAgent: (agentId: string) => void;
  onOpenAgentSettings: (agentId: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MarketplaceFilter>("all");
  const [detailSkillKey, setDetailSkillKey] = useState<string | null>(null);

  const entries = useMemo(() => marketplace.skillsReport?.skills ?? [], [marketplace.skillsReport]);
  const collections = useMemo(() => buildSkillMarketplaceCollections(entries), [entries]);
  const accessMode = useMemo(
    () => deriveAgentSkillsAccessMode(marketplace.skillsAllowlist),
    [marketplace.skillsAllowlist]
  );
  const allowlistSet = useMemo(
    () => buildAgentSkillsAllowlistSet(marketplace.skillsAllowlist),
    [marketplace.skillsAllowlist]
  );

  const filteredCollections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleCollectionIds: SkillMarketplaceCollectionId[] =
      activeFilter === "all"
        ? ["built-in", "installed", "workspace", "extra", "other"]
        : [activeFilter];
    return collections
      .filter((collection) => visibleCollectionIds.includes(collection.id))
      .map((collection) => ({
        ...collection,
        entries: collection.entries.filter((entry) => {
          if (!normalizedQuery) {
            return true;
          }
          return buildSearchBlob(entry).includes(normalizedQuery);
        }),
      }))
      .filter((collection) => collection.entries.length > 0);
  }, [activeFilter, collections, query]);

  const featuredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const featuredCollection = collections.find((collection) => collection.id === "featured");
    if (!featuredCollection) {
      return [];
    }
    return featuredCollection.entries
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }
        return buildSearchBlob(entry).includes(normalizedQuery);
      })
      .slice(0, 3);
  }, [collections, query]);

  const filterCounts = useMemo(() => {
    const counts: Record<MarketplaceFilter, number> = {
      all: entries.length,
      featured: 0,
      installed: 0,
      "setup-required": 0,
      "built-in": 0,
      workspace: 0,
      extra: 0,
      other: 0,
    };
    for (const collection of collections) {
      counts[collection.id] = collection.entries.length;
    }
    return counts;
  }, [collections, entries.length]);

  const detailEntry =
    collections
      .flatMap((collection) => collection.entries)
      .find((entry) => entry.skill.skillKey === detailSkillKey) ?? null;
  const filterLabels: Record<MarketplaceFilter, string> = {
    all: t("marketplace.filter.all"),
    featured: t("marketplace.filter.featured"),
    installed: t("marketplace.filter.installed"),
    "setup-required": t("marketplace.filter.setupRequired"),
    "built-in": t("marketplace.filter.builtIn"),
    workspace: t("marketplace.filter.workspace"),
    extra: t("marketplace.filter.community"),
    other: t("marketplace.filter.other"),
  };
  const readinessLabels = {
    ready: t("marketplace.readiness.ready"),
    "needs-setup": t("marketplace.readiness.needsSetup"),
    unavailable: t("marketplace.readiness.unavailable"),
    "disabled-globally": t("marketplace.readiness.disabledGlobally"),
  } as const;
  const collectionLabels: Partial<Record<SkillMarketplaceCollectionId, string>> = {
    "built-in": t("marketplace.filter.builtIn"),
    installed: t("marketplace.filter.installed"),
    workspace: t("marketplace.filter.workspace"),
    extra: t("marketplace.filter.community"),
    other: t("marketplace.filter.other"),
    featured: t("marketplace.filter.featured"),
    "setup-required": t("marketplace.filter.setupRequired"),
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col">
      <div className="border-b border-cyan-500/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
              {t("marketplace.title")}
            </div>
            <div className="mt-1 font-mono text-[11px] text-white/40">
              {t("marketplace.subtitle")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void marketplace.refresh()}
            className="inline-flex items-center gap-1 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {t("marketplace.refresh")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-[10px] text-amber-100">
          {t("marketplace.installWarning")}
        </div>

        <div className="mt-3 rounded border border-cyan-500/15 bg-white/[0.03] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                {t("marketplace.agentContext")}
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/75">
                {marketplace.selectedAgent?.name ?? t("marketplace.noAgentSelected")}
              </div>
            </div>
            <div className="font-mono text-[10px] text-white/35">
              {t("marketplace.accessMode")}: {accessMode === "selected" ? t("marketplace.selectedSkills") : accessMode}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <select
              value={marketplace.selectedAgentId ?? ""}
              onChange={(event) => marketplace.setSelectedAgentId(event.target.value || null)}
              aria-label={t("marketplace.agentContext")}
              className="min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-2 py-2 font-mono text-[11px] text-white/80 outline-none"
            >
              {marketplace.agents.length === 0 ? <option value="">{t("marketplace.noAgentsAvailable")}</option> : null}
              {marketplace.agents.map((agent) => (
                <option key={agent.agentId} value={agent.agentId}>
                  {agent.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!marketplace.selectedAgentId}
              onClick={() => {
                if (marketplace.selectedAgentId) {
                  onSelectAgent(marketplace.selectedAgentId);
                }
              }}
              className="rounded border border-white/10 bg-white/5 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("marketplace.focusChat")}
            </button>
            <button
              type="button"
              disabled={!marketplace.selectedAgentId}
              onClick={() => {
                if (marketplace.selectedAgentId) {
                  onOpenAgentSettings(marketplace.selectedAgentId);
                }
              }}
              className="rounded border border-white/10 bg-white/5 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("marketplace.settings")}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("marketplace.searchPlaceholder")}
            className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-white/85 outline-none transition focus:border-cyan-400/35"
            aria-label={t("marketplace.searchAria")}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(filterLabels) as MarketplaceFilter[]).map((filterId) => (
            <button
              key={filterId}
              type="button"
              onClick={() => setActiveFilter(filterId)}
              className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                activeFilter === filterId
                  ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/80"
              }`}
            >
              {filterLabels[filterId]} ({filterCounts[filterId]})
            </button>
          ))}
        </div>

        {marketplace.message ? (
          <div
            className={`mt-3 rounded border px-3 py-2 font-mono text-[11px] ${
              marketplace.message.kind === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            {marketplace.message.text}
          </div>
        ) : null}

        {marketplace.error && !marketplace.message ? (
          <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-[11px] text-rose-100">
            {marketplace.error}
          </div>
        ) : null}

        {marketplace.loading ? (
          <div className="mt-4 font-mono text-[11px] text-white/45">{t("marketplace.loadingInventory")}</div>
        ) : null}

        {!marketplace.loading && activeFilter === "all" && featuredEntries.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              {t("marketplace.featuredShelf")}
            </div>
            <div className="grid gap-2">
              {featuredEntries.map((entry) => (
                <button
                  key={`featured:${entry.skill.skillKey}`}
                  type="button"
                  onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                  className="rounded border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 to-transparent px-3 py-3 text-left transition-colors hover:border-cyan-400/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-white/90">{entry.skill.name}</div>
                      <div className="mt-1 font-mono text-[10px] text-cyan-100/75">{entry.metadata.tagline}</div>
                    </div>
                    <div className="rounded border border-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100/85">
                      {entry.metadata.editorBadge ?? t("marketplace.featured")}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-white/55">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-300" />
                      {formatRating(entry.metadata.rating)}
                    </span>
                    <span>{t("marketplace.installsCount", { count: formatInstalls(entry.metadata.installs) })}</span>
                    <span>{entry.metadata.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!marketplace.loading && filteredCollections.length === 0 ? (
          <div className="mt-4 rounded border border-white/10 bg-white/[0.03] px-3 py-4 font-mono text-[11px] text-white/45">
            {t("marketplace.noMatchingSkills")}
          </div>
        ) : null}

        {!marketplace.loading &&
          filteredCollections.map((collection) => (
            <div key={collection.id} className="mt-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                {collectionLabels[collection.id] ?? collection.label}
              </div>
              <div className="flex flex-col gap-2">
                {collection.entries.map((entry) => {
                  const isEnabledForAgent = getAgentSkillEnabled(entry.skill.name, accessMode, allowlistSet);
                  const primaryAction =
                    entry.readiness === "needs-setup" && entry.installable
                      ? {
                          label: t("marketplace.installDeps"),
                          run: () => void marketplace.handleInstallSkill(entry.skill),
                          icon: Download,
                        }
                      : entry.readiness === "disabled-globally"
                        ? {
                            label: t("marketplace.enableGateway"),
                            run: () => void marketplace.handleSetSkillGlobalEnabled(entry.skill.skillKey, true),
                            icon: Settings2,
                          }
                        : entry.readiness === "needs-setup"
                          ? {
                              label: t("marketplace.openSettings"),
                              run: () => {
                                if (marketplace.selectedAgentId) {
                                  onOpenAgentSettings(marketplace.selectedAgentId);
                                }
                              },
                              icon: Settings2,
                            }
                          : null;
                  const PrimaryIcon = primaryAction?.icon ?? Settings2;
                  return (
                    <div
                      key={`${collection.id}:${entry.skill.skillKey}`}
                      className="rounded border border-white/8 bg-white/[0.03] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                              className="truncate font-mono text-[11px] font-semibold text-white/90 transition-colors hover:text-cyan-100"
                            >
                              {entry.skill.name}
                            </button>
                            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
                              {entry.metadata.category}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${READINESS_CLASSES[entry.readiness]}`}
                            >
                              {readinessLabels[entry.readiness]}
                            </span>
                          </div>
                          <div className="mt-2 font-mono text-[10px] text-white/65">{entry.metadata.tagline}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-white/45">
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3 w-3 text-cyan-300" />
                              {entry.metadata.trustLabel}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-300" />
                              {formatRating(entry.metadata.rating)}
                            </span>
                            <span>{t("marketplace.installsCount", { count: formatInstalls(entry.metadata.installs) })}</span>
                            <span>{entry.skill.source}</span>
                          </div>
                          {entry.missingDetails.length > 0 ? (
                            <div className="mt-2 font-mono text-[10px] text-amber-100/85">
                              {entry.missingDetails[0]}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => void marketplace.handleSetSkillEnabled(entry.skill.name, !isEnabledForAgent)}
                            disabled={
                              entry.readiness === "unavailable" ||
                              !marketplace.selectedAgentId ||
                              marketplace.busySkillKey === entry.skill.skillKey
                            }
                            className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                              isEnabledForAgent
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                            }`}
                          >
                            {isEnabledForAgent ? t("marketplace.enabledForAgent") : t("marketplace.enableForAgent")}
                          </button>

                          <div className="flex flex-wrap justify-end gap-2">
                            {primaryAction ? (
                              <button
                                type="button"
                                onClick={primaryAction.run}
                                disabled={marketplace.busySkillKey === entry.skill.skillKey}
                                className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <PrimaryIcon className="h-3.5 w-3.5" />
                                {primaryAction.label}
                              </button>
                            ) : null}

                            {entry.removable ? (
                              <button
                                type="button"
                                onClick={() => void marketplace.handleRemoveSkill(entry.skill)}
                                disabled={marketplace.busySkillKey === entry.skill.skillKey}
                                className="inline-flex items-center gap-1 rounded border border-rose-500/25 bg-rose-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-rose-100 transition-colors hover:border-rose-400/40 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t("marketplace.remove")}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => setDetailSkillKey(entry.skill.skillKey)}
                              className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10"
                            >
                              {t("marketplace.details")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {detailEntry ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#050607]/96">
          <div className="flex items-start justify-between border-b border-cyan-500/10 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                {t("marketplace.skillDetail")}
              </div>
              <div className="mt-1 font-mono text-[14px] font-semibold text-white/90">
                {detailEntry.skill.name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDetailSkillKey(null)}
              className="rounded border border-white/10 bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={t("marketplace.closeDetail")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100">
                  {detailEntry.metadata.category}
                </span>
                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55">
                  {detailEntry.metadata.trustLabel}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${READINESS_CLASSES[detailEntry.readiness]}`}
                >
                  {readinessLabels[detailEntry.readiness]}
                </span>
              </div>
              <div className="mt-3 font-mono text-[11px] text-white/75">{detailEntry.metadata.tagline}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] text-white/55">
                <div className="rounded border border-white/8 bg-black/30 px-2 py-2">
                  <div className="text-white/35">{t("marketplace.rating")}</div>
                  <div className="mt-1 text-white/90">{formatRating(detailEntry.metadata.rating)}</div>
                </div>
                <div className="rounded border border-white/8 bg-black/30 px-2 py-2">
                  <div className="text-white/35">{t("marketplace.installs")}</div>
                  <div className="mt-1 text-white/90">{formatInstalls(detailEntry.metadata.installs)}</div>
                </div>
                <div className="rounded border border-white/8 bg-black/30 px-2 py-2">
                  <div className="text-white/35">{t("marketplace.source")}</div>
                  <div className="mt-1 text-white/90">{detailEntry.skill.source}</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                {t("marketplace.capabilities")}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {detailEntry.metadata.capabilities.map((capability) => (
                  <div
                    key={capability}
                    className="rounded border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[10px] text-white/70"
                  >
                    {capability}
                  </div>
                ))}
              </div>
            </div>

            {detailEntry.missingDetails.length > 0 ? (
              <div className="mt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {t("marketplace.setupNotes")}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {detailEntry.missingDetails.map((line) => (
                    <div
                      key={line}
                      className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-[10px] text-amber-100"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded border border-cyan-500/15 bg-cyan-500/10 px-3 py-3 font-mono text-[10px] text-cyan-100">
              {t("marketplace.gatewaySetupHint")}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {detailEntry.readiness === "needs-setup" && detailEntry.installable ? (
                <button
                  type="button"
                  onClick={() => void marketplace.handleInstallSkill(detailEntry.skill)}
                  disabled={marketplace.busySkillKey === detailEntry.skill.skillKey}
                  className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("marketplace.installDependencies")}
                </button>
              ) : null}
              {detailEntry.readiness === "disabled-globally" ? (
                <button
                  type="button"
                  onClick={() =>
                    void marketplace.handleSetSkillGlobalEnabled(detailEntry.skill.skillKey, true)
                  }
                  disabled={marketplace.busySkillKey === detailEntry.skill.skillKey}
                  className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {t("marketplace.enableForGateway")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!marketplace.selectedAgentId}
                onClick={() => {
                  if (marketplace.selectedAgentId) {
                    onOpenAgentSettings(marketplace.selectedAgentId);
                  }
                }}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t("marketplace.manageInSettings")}
              </button>
              {detailEntry.skill.homepage ? (
                <a
                  href={detailEntry.skill.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("marketplace.homepage")}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
