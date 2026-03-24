"use client";

import { CURATED_ELEVENLABS_VOICES } from "@/lib/voiceReply/catalog";
import { useI18n } from "@/lib/i18n";

type SettingsPanelProps = {
  gatewayStatus?: string;
  gatewayUrl?: string;
  onGatewayDisconnect?: () => void;
  onOpenOnboarding?: () => void;
  officeTitle: string;
  officeTitleLoaded: boolean;
  onOfficeTitleChange: (title: string) => void;
  voiceRepliesEnabled: boolean;
  voiceRepliesVoiceId: string | null;
  voiceRepliesSpeed: number;
  voiceRepliesLoaded: boolean;
  onVoiceRepliesToggle: (enabled: boolean) => void;
  onVoiceRepliesVoiceChange: (voiceId: string | null) => void;
  onVoiceRepliesSpeedChange: (speed: number) => void;
  onVoiceRepliesPreview: (voiceId: string | null, voiceName: string) => void;
};

export function SettingsPanel({
  gatewayStatus,
  gatewayUrl,
  onGatewayDisconnect,
  onOpenOnboarding,
  officeTitle,
  officeTitleLoaded,
  onOfficeTitleChange,
  voiceRepliesEnabled,
  voiceRepliesVoiceId,
  voiceRepliesSpeed,
  voiceRepliesLoaded,
  onVoiceRepliesToggle,
  onVoiceRepliesVoiceChange,
  onVoiceRepliesSpeedChange,
  onVoiceRepliesPreview,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const normalizedGatewayUrl = gatewayUrl?.trim() ?? "";
  const gatewayStateLabel = !gatewayStatus
    ? t("settings.unknown")
    : gatewayStatus === "connected"
      ? t("settings.gatewayState.connected")
      : gatewayStatus === "connecting"
        ? t("settings.gatewayState.connecting")
        : gatewayStatus === "disconnected"
          ? t("settings.gatewayState.disconnected")
          : t("settings.unknown");
  const gatewayDisconnectDisabled = gatewayStatus !== "connected";

  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">{t("settings.studioTitle")}</div>
            <div className="mt-1 text-[10px] text-white/75">
              {t("settings.studioTitleDesc")}
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {officeTitleLoaded ? t("settings.ready") : t("settings.loading")}
          </span>
        </div>
        <input
          type="text"
          value={officeTitle}
          maxLength={48}
          disabled={!officeTitleLoaded}
          onChange={(event) => onOfficeTitleChange(event.target.value)}
          placeholder={t("settings.officeTitlePlaceholder")}
          className="mt-3 w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 text-[10px] text-white/50">
          {t("settings.officeTitleHint")}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">{t("settings.gateway")}</div>
            <div className="mt-1 text-[10px] text-white/75">
              {t("settings.gatewayDesc")}
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {gatewayStateLabel}
          </span>
        </div>
        <div className="mt-3 rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 font-mono text-[10px] text-cyan-100/80">
          {normalizedGatewayUrl || t("settings.noGatewayUrl")}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[10px] text-white/60">
            {t("settings.disconnectHint")}
          </div>
          <button
            type="button"
            onClick={() => onGatewayDisconnect?.()}
            disabled={gatewayDisconnectDisabled}
            className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-100 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("settings.disconnectGateway")}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">{t("settings.onboarding")}</div>
            <div className="mt-1 text-[10px] text-white/75">
              {t("settings.onboardingDesc")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenOnboarding?.()}
            className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/15"
          >
            {t("settings.launchWizard")}
          </button>
        </div>
      </div>
      <div className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("settings.voiceReplies")}
            className={`ui-switch self-center ${voiceRepliesEnabled ? "ui-switch--on" : ""}`}
            onClick={() => onVoiceRepliesToggle(!voiceRepliesEnabled)}
            disabled={!voiceRepliesLoaded}
          >
            <span className="ui-switch-thumb" />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-white">{t("settings.voiceReplies")}</span>
            <span className="text-[10px] text-white/80">
              {t("settings.voiceRepliesDesc")}
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
          {voiceRepliesLoaded
            ? (voiceRepliesEnabled ? t("settings.on") : t("settings.off"))
            : t("settings.loading")}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="text-[11px] font-medium text-white">{t("settings.voice")}</div>
        <div className="mt-1 text-[10px] text-white/75">
          {t("settings.voiceDesc")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CURATED_ELEVENLABS_VOICES.map((voice) => {
            const selected = voice.id === voiceRepliesVoiceId;
            return (
              <button
                key={voice.id ?? "default"}
                type="button"
                onClick={() => {
                  onVoiceRepliesVoiceChange(voice.id);
                  onVoiceRepliesPreview(voice.id, voice.label);
                }}
                disabled={!voiceRepliesLoaded}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-cyan-400/40 bg-cyan-500/12 text-white"
                    : "border-cyan-500/10 bg-black/15 text-white/80 hover:border-cyan-400/20 hover:bg-cyan-500/6"
                }`}
              >
                <div className="text-[11px] font-medium">{voice.label}</div>
                <div className="mt-1 text-[10px] text-white/65">{voice.description}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">{t("settings.speed")}</div>
            <div className="mt-1 text-[10px] text-white/75">
              {t("settings.speedDesc")}
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {voiceRepliesSpeed.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.7"
          max="1.2"
          step="0.05"
          value={voiceRepliesSpeed}
          disabled={!voiceRepliesLoaded}
          onChange={(event) =>
            onVoiceRepliesSpeedChange(Number.parseFloat(event.target.value))
          }
          aria-label={t("settings.speed")}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-cyan-500/15 accent-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
          <span>{t("settings.slower")}</span>
          <span>{t("settings.faster")}</span>
        </div>
      </div>
    </div>
  );
}
