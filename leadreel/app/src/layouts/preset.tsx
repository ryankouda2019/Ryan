import type { ReactNode } from "react";
import { Children, lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubmitInputFor } from "@higgsfield/fnf/client";
import {
  costQueryOptions,
  flattenFeedPages,
  jobsFeedQueryOptions,
  prependGenerations,
  useFnfJobClient,
  useFnfMediaClient,
  useFnfScopeKey,
  useGenerationRun,
  useLiveFeedGenerations,
} from "@higgsfield/fnf-react";
import {
  ChevronDown,
  Clapperboard,
  Compass,
  Download,
  Film,
  Globe,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  Search,
  Users,
} from "lucide-react";
import Sparkles from "@/assets/icon-sparkles-soft.svg?react";
import { Accordion } from "@higgsfield/quanta/accordion";
import { Button } from "@higgsfield/quanta/button";
import { Card, card } from "@higgsfield/quanta/card";
import { Chip } from "@higgsfield/quanta/chip";
import { Grid } from "@higgsfield/quanta/grid";
import { Icon } from "@higgsfield/quanta/icon";
import { Input } from "@higgsfield/quanta/input";
import { Loader } from "@higgsfield/quanta/loader";
import { Media } from "@higgsfield/quanta/media";
import { Modal } from "@higgsfield/quanta/modal";
import { Select } from "@higgsfield/quanta/select";
import { SwitchLabel } from "@higgsfield/quanta/switch";
import { Tabs } from "@higgsfield/quanta/tabs";
import { Toaster, toast } from "@higgsfield/quanta/sonner";
import { Typography } from "@higgsfield/quanta/typography";
import { AssetLibraryModal } from "@/components/asset-library";
import type {
  AssetLibraryItem,
  AssetLibraryPagination,
  AssetSelection,
} from "@/components/asset-library";
import { Composer } from "@/components/composer";
import type { GalleryItem } from "@/components/gallery";
import { LeadCard, SelectedLeadCard } from "@/components/lead-card";
import { OutreachModal } from "@/components/outreach-modal";
import { RailFooter } from "@/components/rail-footer";
import { ScreenEmptyState } from "@/components/screen-empty-state";
import { SettingTrigger } from "@/components/setting-trigger";
import { SignInModal } from "@/components/sign-in-modal";
import { UploadField } from "@/components/upload-field";
import { flattenMediaPages, getNextCursor } from "@/lib/cursor-pages";
import { downloadAuthenticatedFile } from "@/lib/download-authenticated";
import { getSignInUrl, isGuestScope, PRESET_JOBS, uploadAsset } from "@/lib/fnf.browser";
import {
  generationToAssetItem,
  generationToGalleryItem,
  mediaRefToAssetItem,
} from "@/lib/higgsfield-generation-results";
import {
  deleteLeadFn,
  getPitchProfileFn,
  listLeadsFn,
  listPitchesFn,
  recordPitchFn,
  saveLeadFn,
  savePitchProfileFn,
  searchLeadsFn,
  updateLeadFn,
} from "@/lib/leads.functions";
import {
  buildPitchPrompt,
  DEFAULT_PITCH_PROFILE,
  EXAMPLE_OFFER,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PITCH_TONES,
  PITCH_TONE_LABELS,
  RADIUS_OPTIONS_KM,
  compareByOpportunity,
  hasWebsite,
  isPitchTone,
  toLeadInput,
  type LeadDto,
  type LeadSearchCenter,
  type LeadSearchParams,
  type LeadStatus,
  type PitchProfile,
} from "@/lib/leads.shared";

const loadUserGenerations = () => import("@/components/user-generations");
const LazyUserGenerations = lazy(async () => {
  const module = await loadUserGenerations();
  return { default: module.UserGenerations };
});

/**
 * LeadReel — the preset app screen adapted into a lead-finding + video-pitch
 * tool. Left rail: find leads (OpenStreetMap) and describe your pitch;
 * right column: the lead grid (results + saved pipeline), the user's Kling 3.0
 * pitch videos (live fnf history) and a how-it-works explainer. Quanta
 * components + tokens only; every fnf call crosses the browser-safe adapter.
 */

type PresetGenerationInput = SubmitInputFor<typeof PRESET_JOBS>;
type KlingRatio = "16:9" | "9:16" | "1:1";
type KlingMode = "std" | "pro" | "4k";
type LeadsView = "results" | "saved";
type StatusFilter = LeadStatus | "all";

const KLING_MODEL = "kling3_0";
const HISTORY_QUERY = { type: "video" as const, size: 40 };
const IMAGE_LIBRARY_QUERY = { type: "image" as const, size: 40 };
const EXAMPLE_SEARCH: LeadSearchParams = {
  query: "dentist",
  location: "Lynchburg, VA",
  radiusKm: 10,
  withoutWebsite: false,
};

/** Bespoke LeadReel art (crops of the app's own generated launch cover). */
const EMPTY_STATE_IMAGES = [
  "/assets/leadreel-empty-1.webp",
  "/assets/leadreel-empty-2.webp",
  "/assets/leadreel-empty-3.webp",
] as const;
const HOW_IT_WORKS_PREVIEW = "/assets/leadreel-how-it-works.webp";

interface RailOption<T extends string> {
  value: T;
  title: string;
  subtitle?: string;
}

const DURATIONS: RailOption<string>[] = [
  { value: "5", title: "5 seconds", subtitle: "One spoken line" },
  { value: "8", title: "8 seconds", subtitle: "Line + closing" },
  { value: "10", title: "10 seconds", subtitle: "Adds a b-roll beat" },
  { value: "15", title: "15 seconds", subtitle: "Full mini-pitch" },
];

const RATIOS: RailOption<KlingRatio>[] = [
  { value: "16:9", title: "16:9", subtitle: "Horizontal · email, YouTube" },
  { value: "9:16", title: "9:16", subtitle: "Vertical · Reels, TikTok" },
  { value: "1:1", title: "1:1", subtitle: "Square · feeds, DMs" },
];

const MODES: RailOption<KlingMode>[] = [
  { value: "std", title: "Standard", subtitle: "720p · fastest" },
  { value: "pro", title: "Pro", subtitle: "1080p · sharper" },
  { value: "4k", title: "4K", subtitle: "Highest quality" },
];

const TONES: RailOption<string>[] = PITCH_TONES.map((tone) => ({
  value: tone,
  title: PITCH_TONE_LABELS[tone].title,
  subtitle: PITCH_TONE_LABELS[tone].subtitle,
}));

const RADII: RailOption<string>[] = RADIUS_OPTIONS_KM.map((km) => ({
  value: String(km),
  title: `${km} km`,
}));

function useRequiredFnfScopeKey(): string {
  const scopeKey = useFnfScopeKey();
  if (scopeKey == null) throw new Error("LeadReel requires a user/workspace cache scope.");
  return scopeKey;
}

function isKlingRatio(value: string): value is KlingRatio {
  return RATIOS.some((ratio) => ratio.value === value);
}

function isKlingMode(value: string): value is KlingMode {
  return MODES.some((mode) => mode.value === value);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Shared popup placement for the rail pickers — opens into the canvas. */
const PICKER_POPUP = {
  size: "picker",
  surface: "solid",
  side: "right",
  align: "start",
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>;

/** A labelled rail picker: SettingTrigger row + Quanta Select popup. */
function RailSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  formatValue,
}: {
  label: string;
  value: T;
  options: RailOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  formatValue?: (value: T) => string;
}) {
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        const candidate = String(next);
        const option = optionByValue.get(candidate as T);
        if (option) onChange(option.value);
      }}
    >
      <Select.Trigger bare render={<SettingTrigger label={label} />}>
        <Select.Value placeholder={placeholder ?? `Select ${label.toLowerCase()}`}>
          {(selected: string) =>
            formatValue
              ? formatValue(selected as T)
              : (optionByValue.get(selected as T)?.title ?? selected)
          }
        </Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.subtitle ? (
              <Select.ItemContent>
                <Select.ItemText>{option.title}</Select.ItemText>
                <Select.ItemDescription>{option.subtitle}</Select.ItemDescription>
              </Select.ItemContent>
            ) : (
              <Select.ItemText>{option.title}</Select.ItemText>
            )}
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

/** At most this many settings may show in the rail at once. */
const MAX_INLINE_SETTINGS = 4;
/** When settings overflow the budget, this many stay above the reveal button. */
const COLLAPSED_INLINE_SETTINGS = 3;

/**
 * RailSettings — enforces the rail's setting budget. Each child is one setting,
 * in priority order. When there are at most `MAX_INLINE_SETTINGS` they all show;
 * once there are more, only the first `COLLAPSED_INLINE_SETTINGS` stay inline
 * and the rest collapse behind an "Additional settings" toggle.
 */
function RailSettings({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const settings = Children.toArray(children);
  const overflow = settings.length > MAX_INLINE_SETTINGS;
  const inline = overflow ? settings.slice(0, COLLAPSED_INLINE_SETTINGS) : settings;
  const extra = overflow ? settings.slice(COLLAPSED_INLINE_SETTINGS) : [];

  return (
    <>
      {inline}
      {extra.length > 0 ? (
        <>
          <Button
            variant="ghost"
            size="xs"
            className="w-full"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
            end={
              <span
                className={`inline-flex transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
              >
                <Icon size="sm" as={ChevronDown} />
              </span>
            }
          >
            {expanded ? "Fewer settings" : "Additional settings"}
          </Button>
          {expanded ? extra : null}
        </>
      ) : null}
    </>
  );
}

/** Confirms removing a lead that carries pipeline state or pitch videos. */
function RemoveLeadModal({
  lead,
  busy,
  onOpenChange,
  onConfirm,
}: {
  lead: LeadDto | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Modal.Root open={lead != null} onOpenChange={onOpenChange}>
      <Modal.Content size="sm">
        <Modal.Header>
          <Modal.Title>Remove this lead?</Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          <Typography as="p" variant="body-sm-regular" color="secondary">
            {lead != null
              ? `${lead.name} is marked ${LEAD_STATUS_LABELS[lead.status].toLowerCase()}${
                  lead.pitchCount > 0
                    ? ` and has ${lead.pitchCount === 1 ? "1 pitch video" : `${lead.pitchCount} pitch videos`}`
                    : ""
                }. Removing it clears that status and unlinks the videos from this lead. The videos themselves stay in your Higgsfield history.`
              : ""}
          </Typography>
        </Modal.Body>
        <Modal.Footer>
          <Modal.FooterActions>
            <Modal.Close render={<Button variant="tertiary" size="md">Keep lead</Button>} />
            <Button
              variant="danger"
              size="md"
              disabled={busy}
              onClick={onConfirm}
              start={busy ? <Loader size="xs" color="neutral" /> : undefined}
            >
              Remove lead
            </Button>
          </Modal.FooterActions>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

interface LeadRailProps {
  signedIn: boolean;
  requireSignIn: () => boolean;
  selectedLead: LeadDto | null;
  onClearLead: () => void;
  onBrowseLeads: () => void;
  openSections: string[];
  onOpenSectionsChange: (sections: string[]) => void;
  profile: PitchProfile;
  onProfileChange: (patch: Partial<PitchProfile>) => void;
  onProfileCommit: () => void;
  search: LeadSearchParams;
  onSearchChange: (patch: Partial<LeadSearchParams>) => void;
  onSearch: () => void;
  searching: boolean;
  ensureLeadSaved: (lead: LeadDto) => Promise<LeadDto>;
  onGenerationStarted: (leadId: string, generationIds: string[], prompt: string) => void;
  libraryItems: AssetLibraryItem[];
  libraryPagination: AssetLibraryPagination;
  onUpload: (file: File) => Promise<AssetSelection>;
}

/** Left rail — lead search + the Kling 3.0 pitch composer with live cost. */
function LeadRail({
  signedIn,
  requireSignIn,
  selectedLead,
  onClearLead,
  onBrowseLeads,
  openSections,
  onOpenSectionsChange,
  profile,
  onProfileChange,
  onProfileCommit,
  search,
  onSearchChange,
  onSearch,
  searching,
  ensureLeadSaved,
  onGenerationStarted,
  libraryItems,
  libraryPagination,
  onUpload,
}: LeadRailProps) {
  const jobClient = useFnfJobClient<typeof PRESET_JOBS>();
  const scopeKey = useRequiredFnfScopeKey();
  const queryClient = useQueryClient();
  const run = useGenerationRun(jobClient, { scopeKey });
  const prepended = useRef(new Set<string>());
  const pendingPitch = useRef<{ leadId: string; prompt: string } | null>(null);
  const [startFrame, setStartFrame] = useState<AssetSelection | null>(null);
  const [aspectRatio, setAspectRatio] = useState<KlingRatio>("16:9");
  const [duration, setDuration] = useState("8");
  const [mode, setMode] = useState<KlingMode>("std");
  const [showScript, setShowScript] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const canSearch = search.query.trim().length > 0 && search.location.trim().length > 0;
  const canGenerate =
    selectedLead != null &&
    profile.offer.trim().length > 0 &&
    profile.senderName.trim().length > 0;

  const script = useMemo(
    () =>
      buildPitchPrompt({
        leadName: selectedLead?.name ?? "",
        category: selectedLead?.category ?? null,
        city: selectedLead?.city ?? null,
        senderName: profile.senderName,
        offer: profile.offer,
        tone: profile.tone,
        duration: Number(duration),
      }),
    [
      duration,
      profile.offer,
      profile.senderName,
      profile.tone,
      selectedLead?.category,
      selectedLead?.city,
      selectedLead?.name,
    ],
  );

  const startRef = startFrame?.ref;
  const input = useMemo<PresetGenerationInput>(
    () => ({
      model: KLING_MODEL,
      prompt: { instruction: script },
      ...(startRef ? { media: { start_image: startRef } } : {}),
      settings: {
        duration: Number(duration),
        aspectRatio,
        mode,
        sound: "on",
        multiShots: false,
      },
    }),
    [aspectRatio, duration, mode, script, startRef],
  );

  const cost = useQuery({
    ...costQueryOptions(jobClient, input, { enabled: canGenerate && signedIn, scopeKey }),
    // The scope query is the focus gate. Child data must not refetch under a
    // stale key while the host is switching user/workspace identity.
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const fresh = run.generations.filter((generation) => !prepended.current.has(generation.id));
    if (fresh.length === 0) return;
    for (const generation of fresh) prepended.current.add(generation.id);
    prependGenerations(queryClient, HISTORY_QUERY, fresh, { scopeKey });
    const pending = pendingPitch.current;
    pendingPitch.current = null;
    if (pending != null) {
      onGenerationStarted(
        pending.leadId,
        fresh.map((generation) => generation.id),
        pending.prompt,
      );
    }
    // Submission is complete once job ids exist. Videos owns live polling,
    // so release the rail immediately while the backend keeps running.
    run.reset();
  }, [onGenerationStarted, queryClient, run, run.generations, scopeKey]);

  const handleGenerate = async () => {
    if (!canGenerate || run.isRunning || preparing || selectedLead == null) return;
    if (!requireSignIn()) return;
    onProfileCommit();
    setPreparing(true);
    try {
      const saved = await ensureLeadSaved(selectedLead);
      pendingPitch.current = { leadId: saved.id, prompt: script };
      void run.start(input);
    } catch (error) {
      pendingPitch.current = null;
      toast.error(errorMessage(error, "Couldn't save the lead before generating."));
    } finally {
      setPreparing(false);
    }
  };

  const selectStartFrame = (item: AssetSelection) => {
    if (item.kind === "video") {
      toast.error("Start frames must be images — pick a photo or an image generation.");
      return;
    }
    setStartFrame(item);
  };

  const busy = run.isRunning || preparing;
  const runError =
    run.error != null && !("code" in run.error && run.error.code === "confirmation_rejected")
      ? run.error.message
      : null;

  return (
    <aside
      className={card(
        { surface: "solid", elevation: "raised" },
        // Figma input rail: 342px = spacing scale × 85.5. Stretch to the viewport
        // height and scroll internally so the sticky RailFooter can pin the
        // Generate CTA when the chosen fields overflow. `[&>*]:shrink-0` keeps
        // every field at its natural height.
        "h-[calc(100dvh-1.5rem)] w-full shrink-0 gap-3 overflow-y-auto border-q-thin border-q-border-subtle p-3 sm:mx-auto sm:max-w-lg lg:mx-0 lg:h-auto lg:w-85.5 lg:max-w-none [&>*]:shrink-0",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-0.5">
        <Typography as="h1" variant="accent-sm-bold" color="brand" className="uppercase">
          LeadReel
        </Typography>
        <Typography as="span" variant="caption-xs-regular" color="tertiary">
          Kling 3.0 pitch videos
        </Typography>
      </div>

      <SelectedLeadCard lead={selectedLead} onClear={onClearLead} onBrowse={onBrowseLeads} />

      <Accordion.Root
        variant="separated"
        size="sm"
        value={openSections}
        onValueChange={(value) => onOpenSectionsChange(value.map(String))}
      >
        <Accordion.Item value="find">
          <Accordion.Trigger start={<Icon size="sm" as={Search} />}>Find leads</Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSearch();
              }}
            >
              <Input
                label="Business type"
                placeholder="dentist, roofer, coffee shop…"
                value={search.query}
                onChange={(event) => onSearchChange({ query: event.target.value })}
                required
                autoComplete="off"
              />
              <Input
                label="City or area"
                placeholder="Lynchburg, VA"
                description="A city, neighborhood or zip code."
                value={search.location}
                onChange={(event) => onSearchChange({ location: event.target.value })}
                required
                autoComplete="off"
              />
              <RailSelect
                label="Search radius"
                value={String(search.radiusKm)}
                options={RADII}
                onChange={(value) => onSearchChange({ radiusKm: Number(value) })}
              />
              {/* Filtered inside the map query, not after it — otherwise the
                  result cap fills up with businesses that do have a site. */}
              <SwitchLabel
                size="sm"
                label="No website only"
                description="Businesses with no site of their own — the easiest first pitch."
                switchProps={{
                  checked: search.withoutWebsite,
                  onCheckedChange: (checked: boolean) =>
                    onSearchChange({ withoutWebsite: checked }),
                }}
              />
              <Button
                type="submit"
                variant="tertiary"
                size="md"
                className="w-full"
                disabled={searching || !canSearch}
                start={
                  searching ? <Loader size="xs" color="neutral" /> : <Icon size="sm" as={Search} />
                }
              >
                {searching ? "Searching" : "Find leads"}
              </Button>
            </form>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="pitch">
          <Accordion.Trigger start={<Icon size="sm" as={Megaphone} />}>Your pitch</Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <RailSettings>
              <Input
                label="Your name or business"
                placeholder="Ryan from Liberty Video"
                value={profile.senderName}
                onChange={(event) => onProfileChange({ senderName: event.target.value })}
                onBlur={onProfileCommit}
                required
                autoComplete="organization"
              />
              <Composer
                label="What are you offering?"
                placeholder="One or two sentences the presenter will say to the lead."
                value={profile.offer}
                onChange={(event) => onProfileChange({ offer: event.target.value })}
                onBlur={onProfileCommit}
                required
                actions={
                  <>
                    <Composer.Action
                      start={<Icon size="sm" as={Megaphone} />}
                      onClick={() => onProfileChange({ offer: EXAMPLE_OFFER })}
                    >
                      Use example
                    </Composer.Action>
                    <AssetLibraryModal
                      items={libraryItems}
                      pagination={libraryPagination}
                      onUpload={onUpload}
                      onSelect={selectStartFrame}
                      trigger={
                        <Composer.Action start={<Icon size="sm" as={ImageIcon} />}>
                          Start frame
                        </Composer.Action>
                      }
                    />
                  </>
                }
              />
              <RailSelect
                label="Tone"
                value={profile.tone}
                options={TONES}
                onChange={(value) => {
                  if (isPitchTone(value)) onProfileChange({ tone: value });
                }}
              />
              <RailSelect
                label="Aspect ratio"
                value={aspectRatio}
                options={RATIOS}
                onChange={(value) => {
                  if (isKlingRatio(value)) setAspectRatio(value);
                }}
              />
              <RailSelect
                label="Duration"
                value={duration}
                options={DURATIONS}
                onChange={setDuration}
                formatValue={(value) => `${value}s`}
              />
              <RailSelect
                label="Quality"
                value={mode}
                options={MODES}
                onChange={(value) => {
                  if (isKlingMode(value)) setMode(value);
                }}
              />
              {startFrame == null ? (
                <AssetLibraryModal
                  items={libraryItems}
                  pagination={libraryPagination}
                  onUpload={onUpload}
                  onSelect={selectStartFrame}
                  trigger={
                    <UploadField
                      render={<button type="button" />}
                      icon={ImageIcon}
                      title="Add a start frame"
                      subtitle="Optional — your logo, storefront or product photo"
                      className="grow-0"
                    />
                  }
                />
              ) : (
                <UploadField
                  preview={startFrame.src}
                  previewAlt={startFrame.name}
                  previewType="image"
                  onRemove={() => setStartFrame(null)}
                  className="grow-0"
                />
              )}
            </RailSettings>

            <Button
              variant="ghost"
              size="xs"
              className="w-full"
              aria-expanded={showScript}
              onClick={() => setShowScript((prev) => !prev)}
              end={
                <span
                  className={`inline-flex transition-transform duration-150 ${showScript ? "rotate-180" : ""}`}
                >
                  <Icon size="sm" as={ChevronDown} />
                </span>
              }
            >
              {showScript ? "Hide script" : "Preview script"}
            </Button>
            {showScript ? (
              <div className="rounded-q-300 bg-q-transparent-light-05 p-3">
                <Typography as="p" variant="caption-sm-regular" color="secondary">
                  {script}
                </Typography>
              </div>
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>

      {runError != null ? (
        <Typography as="p" variant="caption-sm-regular" color="danger" className="px-1">
          {runError}
        </Typography>
      ) : null}
      {run.warning != null ? (
        <Typography as="p" variant="caption-sm-regular" color="warning" className="px-1">
          {run.warning}
        </Typography>
      ) : null}
      {selectedLead != null && !canGenerate ? (
        <Typography as="p" variant="caption-sm-regular" color="tertiary" className="px-1">
          Add your name and what you're offering under “Your pitch” to enable generation.
        </Typography>
      ) : null}

      <RailFooter>
        <Button
          variant="marketingPrimary"
          size="md"
          className="w-full"
          disabled={!canGenerate || busy}
          onClick={() => void handleGenerate()}
          end={
            busy ? (
              <Loader size="xs" color="neutral" />
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles width={14} height={14} />
                <span className="text-q-body-md-semi-bold">{cost.data?.credits ?? "—"}</span>
              </span>
            )
          }
        >
          {busy ? "Submitting" : selectedLead != null ? "Generate pitch video" : "Pick a lead to pitch"}
        </Button>
      </RailFooter>
    </aside>
  );
}

interface LeadsPanelProps {
  signedIn: boolean;
  onSignIn: () => void;
  filterText: string;
  results: LeadDto[];
  center: LeadSearchCenter | null;
  lastSearch: LeadSearchParams | null;
  searching: boolean;
  searchError: string | null;
  onRetrySearch: () => void;
  onExampleSearch: () => void;
  savedLeads: LeadDto[];
  savedLoading: boolean;
  savedError: string | null;
  onRetrySaved: () => void;
  view: LeadsView;
  onViewChange: (view: LeadsView) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  noWebsiteOnly: boolean;
  onNoWebsiteOnlyChange: (value: boolean) => void;
  selectedLeadSourceId: string | null;
  busyLeadSourceId: string | null;
  onPitch: (lead: LeadDto) => void;
  onMessage: (lead: LeadDto) => void;
  onToggleSave: (lead: LeadDto) => void;
  onStatusChange: (lead: LeadDto, status: LeadStatus) => void;
  onShowVideos: (lead: LeadDto) => void;
  onExport: () => void;
  exporting: boolean;
}

function matchesFilter(lead: LeadDto, filter: string): boolean {
  if (filter.length === 0) return true;
  const haystack = `${lead.name} ${lead.category ?? ""} ${lead.city ?? ""} ${lead.address ?? ""}`.toLowerCase();
  return haystack.includes(filter);
}

/** The Leads tab — search results and the saved pipeline in one grid. */
function LeadsPanel({
  signedIn,
  onSignIn,
  filterText,
  results,
  center,
  lastSearch,
  searching,
  searchError,
  onRetrySearch,
  onExampleSearch,
  savedLeads,
  savedLoading,
  savedError,
  onRetrySaved,
  view,
  onViewChange,
  statusFilter,
  onStatusFilterChange,
  noWebsiteOnly,
  onNoWebsiteOnlyChange,
  selectedLeadSourceId,
  busyLeadSourceId,
  onPitch,
  onMessage,
  onToggleSave,
  onStatusChange,
  onShowVideos,
  onExport,
  exporting,
}: LeadsPanelProps) {
  const filter = filterText.trim().toLowerCase();
  const hasSearched = lastSearch != null;
  const filtering = filter.length > 0 || noWebsiteOnly;
  const passesFilters = (lead: LeadDto) =>
    matchesFilter(lead, filter) && (!noWebsiteOnly || !hasWebsite(lead));
  // Both views rank the same way, so the best lead is always the first tile.
  const visibleSaved = savedLeads
    .filter((lead) => (statusFilter === "all" || lead.status === statusFilter) && passesFilters(lead))
    .sort(compareByOpportunity);
  const visibleResults = results.filter(passesFilters).sort(compareByOpportunity);
  const leads = view === "results" ? visibleResults : visibleSaved;
  const sourceLeads = view === "results" ? results : savedLeads;
  const noWebsiteCount = sourceLeads.filter((lead) => !hasWebsite(lead)).length;
  const showStatusChips = view === "saved" && signedIn && savedLeads.length > 0;
  const showFilterRow = showStatusChips || sourceLeads.length > 0;

  const statusCounts = LEAD_STATUSES.reduce<Record<LeadStatus, number>>(
    (counts, status) => {
      counts[status] = savedLeads.filter((lead) => lead.status === status).length;
      return counts;
    },
    { new: 0, contacted: 0, replied: 0, won: 0, lost: 0 },
  );

  const emptyState = (() => {
    if (view === "results") {
      if (searching && results.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Loader size="md" color="neutral" aria-label="Searching for leads" />
            <Typography as="p" variant="body-sm-regular" color="secondary">
              Searching OpenStreetMap for {lastSearch?.query ?? "businesses"} near{" "}
              {lastSearch?.location ?? "your area"}…
            </Typography>
          </div>
        );
      }
      if (searchError != null && results.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Typography as="p" variant="body-sm-regular" color="danger">
              {searchError}
            </Typography>
            {hasSearched ? (
              <Button variant="tertiary" size="sm" onClick={onRetrySearch}>
                Try again
              </Button>
            ) : null}
          </div>
        );
      }
      if (!hasSearched && results.length === 0) {
        return (
          <ScreenEmptyState
            images={EMPTY_STATE_IMAGES}
            title="Find your first leads"
            description="Search any business type in any city — dentists in Lynchburg, roofers in Austin, gyms in Miami — then pitch each one with a personalized Kling 3.0 video."
            action={
              <Button
                variant="tertiary"
                size="md"
                onClick={onExampleSearch}
                start={<Icon size="sm" as={Search} />}
              >
                Try “{EXAMPLE_SEARCH.query} in {EXAMPLE_SEARCH.location}”
              </Button>
            }
          />
        );
      }
      if (leads.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Typography as="p" variant="body-md-semi-bold" color="primary">
              {filtering ? "No results match those filters" : `No ${lastSearch?.query ?? "businesses"} found`}
            </Typography>
            <Typography as="p" variant="body-sm-regular" color="tertiary">
              {filtering
                ? "Clear the filters above to see every result."
                : lastSearch?.withoutWebsite === true
                  ? `Every ${lastSearch.query} within ${lastSearch.radiusKm} km of ${center?.label ?? lastSearch.location} already has a website. Turn off “No website only” to see them all, or widen the radius.`
                  : `Nothing within ${lastSearch?.radiusKm ?? 10} km of ${center?.label ?? lastSearch?.location ?? "that location"}. Try a wider radius or a broader term like “restaurant” instead of a brand name.`}
            </Typography>
          </div>
        );
      }
      return null;
    }

    if (!signedIn) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <Typography as="p" variant="body-md-semi-bold" color="primary">
            Sign in to see your saved leads
          </Typography>
          <Typography as="p" variant="body-sm-regular" color="tertiary">
            Your pipeline, statuses and pitch videos are tied to your Higgsfield account.
          </Typography>
          <Button variant="tertiary" size="md" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      );
    }
    if (savedLoading && savedLeads.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader size="md" color="neutral" aria-label="Loading saved leads" />
        </div>
      );
    }
    if (savedError != null && savedLeads.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <Typography as="p" variant="body-sm-regular" color="danger">
            {savedError}
          </Typography>
          <Button variant="tertiary" size="sm" onClick={onRetrySaved}>
            Retry
          </Button>
        </div>
      );
    }
    if (savedLeads.length === 0) {
      return (
        <ScreenEmptyState
          images={EMPTY_STATE_IMAGES}
          title="No saved leads yet"
          description="Tap the bookmark on any result to build your pipeline. Generating a pitch video saves the lead automatically."
          action={
            <Button variant="tertiary" size="md" onClick={() => onViewChange("results")}>
              Back to results
            </Button>
          }
        />
      );
    }
    if (leads.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <Typography as="p" variant="body-md-semi-bold" color="primary">
            No saved leads match
          </Typography>
          <Typography as="p" variant="body-sm-regular" color="tertiary">
            Try another status or clear the filters above.
          </Typography>
        </div>
      );
    }
    return null;
  })();

  return (
    <Card surface="solid" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Chip
          size="sm"
          selected={view === "results"}
          onClick={() => onViewChange("results")}
          start={<Icon size="xs" as={Search} />}
        >
          Results{hasSearched ? ` · ${results.length}` : ""}
        </Chip>
        <Chip
          size="sm"
          selected={view === "saved"}
          onClick={() => onViewChange("saved")}
          start={<Icon size="xs" as={Users} />}
        >
          Saved{signedIn ? ` · ${savedLeads.length}` : ""}
        </Chip>
        {leads.length > 0 ? (
          <Typography as="span" variant="caption-sm-regular" color="tertiary" truncate className="min-w-0">
            {center != null && view === "results" ? `near ${center.label} · ` : ""}sorted by opportunity
          </Typography>
        ) : null}
        <span className="flex-1" />
        {view === "saved" && signedIn && savedLeads.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={onExport}
            start={exporting ? <Loader size="xs" color="neutral" /> : <Icon size="sm" as={Download} />}
          >
            {exporting ? "Exporting" : "Export CSV"}
          </Button>
        ) : null}
      </div>

      {showFilterRow ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {showStatusChips ? (
            <>
              <Chip
                size="xs"
                color="neutral"
                selected={statusFilter === "all"}
                onClick={() => onStatusFilterChange("all")}
              >
                All · {savedLeads.length}
              </Chip>
              {LEAD_STATUSES.map((status) => (
                <Chip
                  key={status}
                  size="xs"
                  color="neutral"
                  selected={statusFilter === status}
                  onClick={() => onStatusFilterChange(status)}
                >
                  {LEAD_STATUS_LABELS[status]} · {statusCounts[status]}
                </Chip>
              ))}
              <span aria-hidden className="mx-1 h-4 w-px bg-q-border-subtle" />
            </>
          ) : null}
          <Chip
            size="xs"
            color="neutral"
            selected={noWebsiteOnly}
            onClick={() => onNoWebsiteOnlyChange(!noWebsiteOnly)}
            start={<Icon size="xs" as={Globe} />}
          >
            No website · {noWebsiteCount}
          </Chip>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {emptyState ?? (
          <Grid cols="auto-fit" minColWidth="17rem" gap={3} className="pb-1">
            {leads.map((lead) => (
              <LeadCard
                key={lead.sourceId}
                lead={lead}
                selected={lead.sourceId === selectedLeadSourceId}
                busy={lead.sourceId === busyLeadSourceId}
                onPitch={onPitch}
                onMessage={onMessage}
                onToggleSave={onToggleSave}
                onStatusChange={onStatusChange}
                onShowVideos={onShowVideos}
              />
            ))}
          </Grid>
        )}
      </div>
    </Card>
  );
}

/** "How it works in 3 steps" explainer — the third tab's panel content. */
function HowItWorks({ onStart }: { onStart: () => void }) {
  const steps: { title: string; description: string; preview: ReactNode }[] = [
    {
      title: "Find leads",
      description:
        "Type a business type and a city. LeadReel searches OpenStreetMap and lists real local businesses with their phone, website and address.",
      preview: (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-q-300 border border-dashed border-q-border-subtle px-8">
          <Icon as={Search} size="md" color="secondary" />
          <div className="flex flex-col items-center gap-1 text-center">
            <Typography as="span" variant="body-sm-semi-bold" color="primary" className="uppercase">
              dentist · Lynchburg, VA
            </Typography>
            <Typography as="span" variant="caption-xs-regular" color="secondary">
              Up to 60 businesses within your radius
            </Typography>
          </div>
        </div>
      ),
    },
    {
      title: "Pick a lead & write your offer",
      description:
        "Choose a business, add your name and what you're offering. LeadReel writes a spoken script addressed to that lead by name — preview it before you generate.",
      preview: (
        <div className="flex h-full items-center justify-center">
          <Button variant="marketingPrimary" size="lg" onClick={onStart} start={<Sparkles width={18} height={18} />}>
            Generate pitch video
          </Button>
        </div>
      ),
    },
    {
      title: "Send the Kling 3.0 video",
      description:
        "Kling 3.0 renders a presenter speaking your pitch with lip-synced audio. Download it from Videos, send it to the lead, and track the reply in your pipeline.",
      preview: (
        <div className="flex h-full items-center justify-center p-6">
          <Media ratio={16 / 9} rounded="md" className="h-full w-auto max-w-full">
            <Media.Image src={HOW_IT_WORKS_PREVIEW} alt="LeadReel presenter pitching a local business" />
          </Media>
        </div>
      ),
    },
  ];

  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <section className="flex flex-col gap-6 sm:gap-8">
        <header className="flex flex-col gap-2">
          <Typography as="h2" variant="accent-lg-bold" color="primary" className="uppercase">
            How it works <span className="text-q-text-brand">in 3 steps</span>
          </Typography>
          <Typography as="p" variant="body-sm-regular" color="secondary">
            Every video is generated on your Higgsfield account with Kling 3.0 — you approve the
            credit cost before anything is submitted.
          </Typography>
        </header>

        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col gap-4">
              <div className="h-48 overflow-hidden rounded-q-400 bg-q-transparent-light-05 sm:h-60">
                {step.preview}
              </div>
              <div className="flex flex-col gap-2">
                <Typography as="h3" variant="accent-xs-bold" color="primary" className="uppercase">
                  {`${index + 1}. ${step.title}`}
                </Typography>
                <Typography as="p" variant="body-sm-regular" color="secondary">
                  {step.description}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}

interface LeadWorkspaceProps {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  filterText: string;
  onFilterTextChange: (value: string) => void;
  leadsPanel: Omit<LeadsPanelProps, "filterText">;
  onStartPitching: () => void;
  historyItems: GalleryItem[];
  historyLoading: boolean;
  historyHasMore: boolean;
  historyLoadingMore: boolean;
  onHistoryLoadMore: () => Promise<unknown>;
  onHistoryRetry: () => void;
  historyError?: string;
}

/** Right column — the lead grid, the user's live pitch-video feed, and the explainer. */
function LeadWorkspace({
  activeTab,
  onActiveTabChange,
  filterText,
  onFilterTextChange,
  leadsPanel,
  onStartPitching,
  historyItems,
  historyLoading,
  historyHasMore,
  historyLoadingMore,
  onHistoryLoadMore,
  onHistoryRetry,
  historyError,
}: LeadWorkspaceProps) {
  return (
    <section className="flex h-[calc(100dvh-1.5rem)] min-h-0 min-w-0 flex-none flex-col lg:h-auto lg:flex-1">
      {/* `flex!` — the q-tabs utility hard-sets `display: block`, which would
          otherwise beat this class and kill both the gap and the height chain. */}
      <Tabs.Root
        variant="segmented"
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = String(value);
          onActiveTabChange(nextTab);
          // Start the interaction-only chunk alongside the history request/UI.
          if (nextTab === "videos") void loadUserGenerations();
        }}
        className="flex! min-h-0 flex-1 flex-col gap-3"
      >
        <header className="flex shrink-0 flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <Tabs.List
            items={[
              { value: "leads", label: "Leads", start: <Icon size="sm" as={Users} /> },
              { value: "videos", label: "Videos", start: <Icon size="sm" as={Film} /> },
              {
                value: "how-it-works",
                label: "How it works",
                start: <Icon size="sm" as={Newspaper} />,
              },
            ]}
          />
          {activeTab === "leads" ? (
            <Input
              placeholder="Filter by name, category or city"
              aria-label="Filter leads"
              className="w-full md:w-64"
              value={filterText}
              onChange={(event) => onFilterTextChange(event.target.value)}
              start={<Icon size="sm" as={Search} />}
            />
          ) : null}
        </header>

        <Tabs.Panel value="leads" className="flex min-h-0 flex-1 flex-col pt-0">
          <LeadsPanel {...leadsPanel} filterText={filterText} />
        </Tabs.Panel>

        <Tabs.Panel value="videos" className="flex min-h-0 flex-1 flex-col pt-0">
          <Card surface="solid" className="min-h-0 flex-1 overflow-hidden p-4">
            {historyLoading && historyItems.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader size="md" color="neutral" aria-label="Loading your pitch videos" />
              </div>
            ) : historyError != null && historyItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Typography as="p" variant="body-sm-regular" color="danger">
                  {historyError}
                </Typography>
                <Button variant="tertiary" size="sm" onClick={onHistoryRetry}>
                  Retry
                </Button>
              </div>
            ) : historyItems.length === 0 ? (
              <ScreenEmptyState
                images={EMPTY_STATE_IMAGES}
                title="No pitch videos yet"
                description="Pick a lead, describe your offer and generate your first Kling 3.0 pitch. Finished videos land here, ready to download and send."
                action={
                  <Button
                    variant="tertiary"
                    size="md"
                    onClick={onStartPitching}
                    start={<Icon size="sm" as={Clapperboard} />}
                  >
                    Pick a lead
                  </Button>
                }
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-3">
                {historyError != null ? (
                  <div className="flex shrink-0 items-center justify-between gap-3 rounded-q-300 bg-q-transparent-light-05 px-3 py-2">
                    <Typography as="p" variant="caption-sm-regular" color="danger">
                      {historyError}
                    </Typography>
                    <Button variant="tertiary" size="xs" onClick={onHistoryRetry}>
                      Retry
                    </Button>
                  </div>
                ) : null}
                {activeTab === "videos" ? (
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center">
                        <Loader size="md" color="neutral" aria-label="Loading videos view" />
                      </div>
                    }
                  >
                    <LazyUserGenerations
                      items={historyItems}
                      hasMore={historyHasMore}
                      loadingMore={historyLoadingMore}
                      onLoadMore={onHistoryLoadMore}
                    />
                  </Suspense>
                ) : null}
              </div>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="how-it-works" className="flex min-h-0 flex-1 flex-col pt-0">
          <HowItWorks onStart={onStartPitching} />
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
}

/** A lead that was saved and then removed goes back to being a plain result. */
function asUnsavedResult(lead: LeadDto): LeadDto {
  return {
    ...lead,
    id: lead.sourceId,
    saved: false,
    status: "new",
    notes: "",
    pitchCount: 0,
    createdAt: null,
    updatedAt: null,
  };
}

export interface PresetTemplateProps {
  /**
   * Preset tile orientation — kept for API compatibility with the scaffold;
   * LeadReel's grid is a lead list, so it has no effect here.
   */
  presetOrientation?: "horizontal" | "vertical";
}

export function PresetTemplate(_props: PresetTemplateProps = {}) {
  const jobClient = useFnfJobClient<typeof PRESET_JOBS>();
  const mediaClient = useFnfMediaClient();
  const scopeKey = useRequiredFnfScopeKey();
  const signedIn = !isGuestScope(scopeKey);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("leads");
  const [filterText, setFilterText] = useState("");
  const [uploads, setUploads] = useState<AssetLibraryItem[]>([]);
  const [pendingSignInUrl, setPendingSignInUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeadDto | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["find"]);
  const [profileEdits, setProfileEdits] = useState<PitchProfile | null>(null);
  const [searchEdits, setSearchEdits] = useState<LeadSearchParams | null>(null);
  const [results, setResults] = useState<LeadDto[]>([]);
  const [center, setCenter] = useState<LeadSearchCenter | null>(null);
  const [lastSearch, setLastSearch] = useState<LeadSearchParams | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [view, setView] = useState<LeadsView>("results");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [messageLead, setMessageLead] = useState<LeadDto | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LeadDto | null>(null);
  const [exporting, setExporting] = useState(false);

  const requireSignIn = useCallback((): boolean => {
    const signInUrl = getSignInUrl(
      scopeKey,
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    if (signInUrl != null) {
      setPendingSignInUrl(signInUrl);
      return false;
    }
    return true;
  }, [scopeKey]);

  // ── LeadReel product state (D1, via server functions) ─────────────────────
  const leadsKey = useMemo(() => ["leadreel", scopeKey, "leads"] as const, [scopeKey]);
  const pitchesKey = useMemo(() => ["leadreel", scopeKey, "pitches"] as const, [scopeKey]);
  const profileKey = useMemo(() => ["leadreel", scopeKey, "profile"] as const, [scopeKey]);

  const savedQuery = useQuery({
    queryKey: leadsKey,
    queryFn: async () => {
      const result = await listLeadsFn();
      if (!result.ok) throw new Error(result.message);
      return result.leads;
    },
    enabled: signedIn,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const pitchesQuery = useQuery({
    queryKey: pitchesKey,
    queryFn: async () => {
      const result = await listPitchesFn();
      if (!result.ok) throw new Error(result.message);
      return result.pitches;
    },
    enabled: signedIn,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const result = await getPitchProfileFn();
      if (!result.ok) throw new Error(result.message);
      return result.profile;
    },
    enabled: signedIn,
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const savedLeads = useMemo(() => savedQuery.data ?? [], [savedQuery.data]);
  const savedBySource = useMemo(
    () => new Map(savedLeads.map((lead) => [lead.sourceId, lead])),
    [savedLeads],
  );
  const savedReady = savedQuery.isSuccess;

  // Saved rows are the truth for anything the user has bookmarked; a result
  // that is no longer saved falls back to its plain search-result shape.
  const mergedResults = useMemo(
    () =>
      results.map((lead) => {
        const saved = savedBySource.get(lead.sourceId);
        if (saved) return saved;
        return lead.saved && savedReady ? asUnsavedResult(lead) : lead;
      }),
    [results, savedBySource, savedReady],
  );
  const selectedLead = useMemo(() => {
    if (selected == null) return null;
    const saved = savedBySource.get(selected.sourceId);
    if (saved) return saved;
    return selected.saved && savedReady ? asUnsavedResult(selected) : selected;
  }, [savedBySource, savedReady, selected]);

  const serverProfile = profileQuery.data ?? DEFAULT_PITCH_PROFILE;
  const profile = profileEdits ?? serverProfile;
  const search: LeadSearchParams = searchEdits ?? {
    query: serverProfile.lastQuery,
    location: serverProfile.lastLocation,
    radiusKm: serverProfile.lastRadiusKm,
    withoutWebsite: serverProfile.lastWithoutWebsite,
  };

  const profileMutation = useMutation({
    mutationFn: (next: PitchProfile) => savePitchProfileFn({ data: next }),
    onSuccess: (result) => {
      if (result.ok) queryClient.setQueryData(profileKey, result.profile);
    },
  });
  const persistProfile = useCallback(
    (next: PitchProfile) => {
      if (!signedIn) return;
      profileMutation.mutate(next);
    },
    [profileMutation, signedIn],
  );
  const handleProfileChange = (patch: Partial<PitchProfile>) =>
    setProfileEdits({ ...profile, ...patch });
  const handleProfileCommit = () => {
    if (profileEdits != null) {
      persistProfile({
        ...profileEdits,
        lastQuery: search.query,
        lastLocation: search.location,
        lastRadiusKm: search.radiusKm,
        lastWithoutWebsite: search.withoutWebsite,
      });
    }
  };
  const handleSearchChange = (patch: Partial<LeadSearchParams>) =>
    setSearchEdits({ ...search, ...patch });

  const searchMutation = useMutation({
    mutationFn: (params: LeadSearchParams) => searchLeadsFn({ data: params }),
    onSuccess: (result, params) => {
      if (!result.ok) {
        setSearchError(result.message);
        return;
      }
      setSearchError(null);
      setResults(result.leads);
      setCenter(result.center);
      setLastSearch(params);
      setView("results");
      setActiveTab("leads");
      if (result.leads.length > 0) {
        const noun = result.leads.length === 1 ? "business" : "businesses";
        toast.success(
          params.withoutWebsite
            ? `${result.leads.length} ${noun} with no website near ${result.center.label}`
            : `${result.leads.length} ${noun} found near ${result.center.label}`,
        );
      }
    },
    onError: (error) => setSearchError(errorMessage(error, "Lead search failed. Please try again.")),
  });

  const runSearch = useCallback(
    (params: LeadSearchParams) => {
      if (!requireSignIn()) return;
      const trimmed = {
        query: params.query.trim(),
        location: params.location.trim(),
        radiusKm: params.radiusKm,
        withoutWebsite: params.withoutWebsite,
      };
      if (trimmed.query.length === 0 || trimmed.location.length === 0) return;
      setSearchEdits(trimmed);
      setLastSearch(trimmed);
      setSearchError(null);
      persistProfile({
        ...profile,
        lastQuery: trimmed.query,
        lastLocation: trimmed.location,
        lastRadiusKm: trimmed.radiusKm,
        lastWithoutWebsite: trimmed.withoutWebsite,
      });
      searchMutation.mutate(trimmed);
    },
    [persistProfile, profile, requireSignIn, searchMutation],
  );

  const applySavedLead = useCallback(
    (saved: LeadDto) => {
      queryClient.setQueryData<LeadDto[]>(leadsKey, (current) => {
        const rest = (current ?? []).filter((lead) => lead.sourceId !== saved.sourceId);
        return [saved, ...rest];
      });
      void queryClient.invalidateQueries({ queryKey: leadsKey });
    },
    [leadsKey, queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: (lead: LeadDto) => saveLeadFn({ data: toLeadInput(lead) }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      applySavedLead(result.lead);
      toast.success(`Saved ${result.lead.name} to your leads`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't save that lead.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (lead: LeadDto) => deleteLeadFn({ data: { id: lead.id } }),
    onSuccess: (result, lead) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      queryClient.setQueryData<LeadDto[]>(leadsKey, (current) =>
        (current ?? []).filter((item) => item.id !== lead.id),
      );
      void queryClient.invalidateQueries({ queryKey: leadsKey });
      void queryClient.invalidateQueries({ queryKey: pitchesKey });
      setRemoveTarget(null);
      toast(`Removed ${lead.name} from your leads`, {
        action: { label: "Undo", onClick: () => saveMutation.mutate(lead) },
      });
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't remove that lead.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ lead, status }: { lead: LeadDto; status: LeadStatus }) =>
      updateLeadFn({ data: { id: lead.id, status } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      applySavedLead(result.lead);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update that lead.")),
  });

  const recordPitchMutation = useMutation({
    mutationFn: (variables: { leadId: string; generationIds: string[]; prompt: string }) =>
      recordPitchFn({ data: { ...variables, model: KLING_MODEL } }),
    onSuccess: (result) => {
      if (result.ok) applySavedLead(result.lead);
      void queryClient.invalidateQueries({ queryKey: pitchesKey });
    },
  });

  const ensureLeadSaved = useCallback(
    async (lead: LeadDto): Promise<LeadDto> => {
      const existing = savedBySource.get(lead.sourceId);
      if (existing) return existing;
      const result = await saveLeadFn({ data: toLeadInput(lead) });
      if (!result.ok) throw new Error(result.message);
      applySavedLead(result.lead);
      return result.lead;
    },
    [applySavedLead, savedBySource],
  );

  // ── fnf: the user's live Kling history + asset library ────────────────────
  const history = useInfiniteQuery({
    ...jobsFeedQueryOptions(jobClient, HISTORY_QUERY, { scopeKey }),
    getNextPageParam: getNextCursor,
    select: flattenFeedPages,
  });
  const imageHistory = useInfiniteQuery({
    ...jobsFeedQueryOptions(jobClient, IMAGE_LIBRARY_QUERY, { scopeKey }),
    getNextPageParam: getNextCursor,
    select: flattenFeedPages,
  });
  const liveGenerations = useMemo(
    () => [...(history.data ?? []), ...(imageHistory.data ?? [])],
    [history.data, imageHistory.data],
  );
  useLiveFeedGenerations(jobClient, liveGenerations, { scopeKey });
  const persistedUploads = useInfiniteQuery({
    queryKey: ["fnf", "scope", scopeKey, "media", "image"],
    queryFn: ({ pageParam }) =>
      mediaClient.list({
        type: "image",
        size: 40,
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: getNextCursor,
    select: flattenMediaPages,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const generations = useMemo(() => history.data ?? [], [history.data]);
  const leadNameByGeneration = useMemo(
    () => new Map((pitchesQuery.data ?? []).map((pitch) => [pitch.id, pitch.leadName])),
    [pitchesQuery.data],
  );
  const historyItems = useMemo(
    () =>
      generations
        .map((generation) => {
          const item = generationToGalleryItem(generation);
          if (item == null) return null;
          const leadName = leadNameByGeneration.get(generation.id);
          if (leadName == null) return item;
          const prompt = `Pitch for ${leadName} — ${item.prompt}`;
          return { ...item, prompt, alt: prompt };
        })
        .filter((item): item is GalleryItem => item != null),
    [generations, leadNameByGeneration],
  );
  const libraryGenerations = useMemo(
    () => [...generations, ...(imageHistory.data ?? [])],
    [generations, imageHistory.data],
  );
  const libraryItems = useMemo(() => {
    const localIds = new Set(uploads.map((item) => item.ref?.id));
    return [
      ...uploads,
      ...(persistedUploads.data ?? [])
        .filter((ref) => !localIds.has(ref.id))
        .map(mediaRefToAssetItem)
        .filter((item): item is AssetLibraryItem => item != null),
      ...libraryGenerations
        .map(generationToAssetItem)
        .filter((item): item is AssetLibraryItem => item != null),
    ];
  }, [libraryGenerations, persistedUploads.data, uploads]);
  const loadMoreUploads =
    persistedUploads.data == null ||
    (persistedUploads.error != null && !persistedUploads.isFetchNextPageError)
      ? persistedUploads.refetch
      : persistedUploads.fetchNextPage;
  const loadMoreLibraryVideos =
    history.data == null || (history.error != null && !history.isFetchNextPageError)
      ? history.refetch
      : history.fetchNextPage;
  const loadMoreLibraryImages =
    imageHistory.data == null || (imageHistory.error != null && !imageHistory.isFetchNextPageError)
      ? imageHistory.refetch
      : imageHistory.fetchNextPage;

  const libraryPagination = useMemo<AssetLibraryPagination>(
    () => ({
      uploads: {
        hasMore: persistedUploads.hasNextPage === true,
        loading: persistedUploads.isPending || persistedUploads.isFetchingNextPage,
        ...(persistedUploads.error instanceof Error
          ? { error: persistedUploads.error.message }
          : {}),
        onLoadMore: loadMoreUploads,
      },
      image: {
        hasMore: imageHistory.hasNextPage === true,
        loading: imageHistory.isPending || imageHistory.isFetchingNextPage,
        ...(imageHistory.error instanceof Error ? { error: imageHistory.error.message } : {}),
        onLoadMore: loadMoreLibraryImages,
      },
      video: {
        hasMore: history.hasNextPage === true,
        loading: history.isPending || history.isFetchingNextPage,
        ...(history.error instanceof Error ? { error: history.error.message } : {}),
        onLoadMore: loadMoreLibraryVideos,
      },
    }),
    [
      history.error,
      history.hasNextPage,
      history.isFetchingNextPage,
      history.isPending,
      imageHistory.error,
      imageHistory.hasNextPage,
      imageHistory.isFetchingNextPage,
      imageHistory.isPending,
      loadMoreLibraryImages,
      loadMoreLibraryVideos,
      loadMoreUploads,
      persistedUploads.error,
      persistedUploads.hasNextPage,
      persistedUploads.isFetchingNextPage,
      persistedUploads.isPending,
    ],
  );

  const handleUpload = async (file: File): Promise<AssetSelection> => {
    const uploaded = await uploadAsset(file);
    const item = { ...uploaded, kind: "upload" as const, personal: true };
    setUploads((current) => [item, ...current.filter((item) => item.ref?.id !== uploaded.ref?.id)]);
    return item;
  };

  // ── Navigation + lead actions ─────────────────────────────────────────────
  const showVideos = useCallback(() => {
    if (!requireSignIn()) return;
    void loadUserGenerations();
    setActiveTab("videos");
  }, [requireSignIn]);
  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === "videos" && !requireSignIn()) return;
      setActiveTab(tab);
    },
    [requireSignIn],
  );
  const handlePitchLead = useCallback((lead: LeadDto) => {
    setSelected(lead);
    setOpenSections(["pitch"]);
  }, []);
  const handleToggleSave = (lead: LeadDto) => {
    if (!requireSignIn()) return;
    if (!lead.saved) {
      saveMutation.mutate(lead);
      return;
    }
    if (lead.pitchCount > 0 || lead.status !== "new") {
      setRemoveTarget(lead);
      return;
    }
    deleteMutation.mutate(lead);
  };
  const handleStatusChange = (lead: LeadDto, status: LeadStatus) => {
    if (!requireSignIn()) return;
    updateMutation.mutate({ lead, status });
  };
  const handleShowVideos = (lead: LeadDto) => {
    setFilterText("");
    setSelected(lead);
    showVideos();
  };
  const handleGenerationStarted = useCallback(
    (leadId: string, generationIds: string[], prompt: string) => {
      recordPitchMutation.mutate({ leadId, generationIds, prompt });
      toast.success("Your pitch video is generating", {
        description: "It will appear under Videos in a minute or two.",
      });
      showVideos();
    },
    [recordPitchMutation, showVideos],
  );
  const handleExport = async () => {
    if (!requireSignIn()) return;
    setExporting(true);
    try {
      await downloadAuthenticatedFile("/api/leads/export", "leadreel-leads.csv");
    } catch (error) {
      toast.error(errorMessage(error, "The export could not be downloaded."));
    } finally {
      setExporting(false);
    }
  };
  const startPitching = () => {
    setActiveTab("leads");
    setView(results.length > 0 || !signedIn ? "results" : savedLeads.length > 0 ? "saved" : "results");
  };

  const busyLeadSourceId =
    (saveMutation.isPending ? saveMutation.variables?.sourceId : null) ??
    (deleteMutation.isPending ? deleteMutation.variables?.sourceId : null) ??
    (updateMutation.isPending ? updateMutation.variables?.lead.sourceId : null) ??
    null;

  return (
    <div className="flex min-h-dvh flex-col gap-5 overflow-x-hidden bg-q-background-primary px-4 py-3 lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Toaster position="bottom-center" />
      <SignInModal
        open={pendingSignInUrl != null}
        signInUrl={pendingSignInUrl}
        onOpenChange={(open) => {
          if (!open) setPendingSignInUrl(null);
        }}
      />
      <OutreachModal
        lead={messageLead}
        profile={profile}
        onOpenChange={(open) => {
          if (!open) setMessageLead(null);
        }}
        onPitch={(lead) => {
          setMessageLead(null);
          handlePitchLead(lead);
        }}
      />
      <RemoveLeadModal
        lead={removeTarget}
        busy={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onConfirm={() => {
          if (removeTarget != null) deleteMutation.mutate(removeTarget);
        }}
      />
      <LeadRail
        signedIn={signedIn}
        requireSignIn={requireSignIn}
        selectedLead={selectedLead}
        onClearLead={() => setSelected(null)}
        onBrowseLeads={startPitching}
        openSections={openSections}
        onOpenSectionsChange={setOpenSections}
        profile={profile}
        onProfileChange={handleProfileChange}
        onProfileCommit={handleProfileCommit}
        search={search}
        onSearchChange={handleSearchChange}
        onSearch={() => runSearch(search)}
        searching={searchMutation.isPending}
        ensureLeadSaved={ensureLeadSaved}
        onGenerationStarted={handleGenerationStarted}
        libraryItems={libraryItems}
        libraryPagination={libraryPagination}
        onUpload={handleUpload}
      />
      <LeadWorkspace
        activeTab={activeTab}
        onActiveTabChange={handleTabChange}
        filterText={filterText}
        onFilterTextChange={setFilterText}
        onStartPitching={startPitching}
        leadsPanel={{
          signedIn,
          onSignIn: () => void requireSignIn(),
          results: mergedResults,
          center,
          lastSearch,
          searching: searchMutation.isPending,
          searchError,
          onRetrySearch: () => {
            if (lastSearch != null) runSearch(lastSearch);
          },
          onExampleSearch: () => runSearch(EXAMPLE_SEARCH),
          savedLeads,
          savedLoading: savedQuery.isPending && signedIn,
          savedError: savedQuery.error instanceof Error ? savedQuery.error.message : null,
          onRetrySaved: () => void savedQuery.refetch(),
          view,
          onViewChange: setView,
          statusFilter,
          onStatusFilterChange: setStatusFilter,
          noWebsiteOnly,
          onNoWebsiteOnlyChange: setNoWebsiteOnly,
          selectedLeadSourceId: selectedLead?.sourceId ?? null,
          busyLeadSourceId,
          onPitch: handlePitchLead,
          onMessage: setMessageLead,
          onToggleSave: handleToggleSave,
          onStatusChange: handleStatusChange,
          onShowVideos: handleShowVideos,
          onExport: () => void handleExport(),
          exporting,
        }}
        historyItems={historyItems}
        historyLoading={history.isPending}
        historyHasMore={history.error == null && history.hasNextPage === true}
        historyLoadingMore={history.isFetchingNextPage}
        onHistoryLoadMore={loadMoreLibraryVideos}
        onHistoryRetry={() => void loadMoreLibraryVideos()}
        historyError={history.error instanceof Error ? history.error.message : undefined}
      />
    </div>
  );
}
