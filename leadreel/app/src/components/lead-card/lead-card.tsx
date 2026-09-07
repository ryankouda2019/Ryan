import type { ReactNode } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Clapperboard,
  Compass,
  Film,
  Globe,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  X,
} from "lucide-react";
import { Badge } from "@higgsfield/quanta/badge";
import { Button } from "@higgsfield/quanta/button";
import type { IconGlyph } from "@higgsfield/quanta/icon";
import { Icon } from "@higgsfield/quanta/icon";
import { Loader } from "@higgsfield/quanta/loader";
import { Select } from "@higgsfield/quanta/select";
import { Tag } from "@higgsfield/quanta/tag";
import { Typography } from "@higgsfield/quanta/typography";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  OPPORTUNITY_TIER_LABELS,
  describeLead,
  hasWebsite,
  hostLabel,
  isLeadStatus,
  mailHref,
  safeHref,
  scoreLead,
  telHref,
  type LeadDto,
  type LeadStatus,
} from "@/lib/leads.shared";
import { cn } from "@/lib/utils";

/**
 * LeadCard — one business lead in the Leads grid (search result or saved
 * pipeline row): name, category, contact details, pipeline status and the
 * actions that drive LeadReel (pitch it, save it, change its status). Built
 * from Quanta primitives + `q-` tokens; no nested Card (the grid already sits
 * on a Card surface).
 */

const STATUS_BADGE_VARIANT: Record<LeadStatus, "blue" | "purple" | "pink" | "lime" | "nBlue"> = {
  new: "blue",
  contacted: "purple",
  replied: "pink",
  won: "lime",
  lost: "nBlue",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]} size="xs" text={LEAD_STATUS_LABELS[status]} />;
}

export function LeadStatusSelect({
  value,
  onChange,
  disabled,
  ariaLabel = "Lead status",
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Select.Root
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const status = String(next);
        if (isLeadStatus(status) && status !== value) onChange(status);
      }}
    >
      <Select.Trigger size="sm" aria-label={ariaLabel}>
        <Select.Value>
          {(selected: string) => (isLeadStatus(selected) ? LEAD_STATUS_LABELS[selected] : selected)}
        </Select.Value>
      </Select.Trigger>
      <Select.Content surface="solid" side="bottom" align="end" sideOffset={6}>
        {LEAD_STATUSES.map((status) => (
          <Select.Item key={status} value={status}>
            <Select.ItemText>{LEAD_STATUS_LABELS[status]}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

const LINK_CLASS =
  "min-w-0 truncate text-q-text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-q-border-focus";

function ContactRow({ icon, label, children }: { icon: IconGlyph; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon as={icon} size="sm" color="tertiary" label={label} className="shrink-0" />
      <div className="flex min-w-0 flex-1 items-center text-q-body-sm-regular text-q-text-secondary">
        {children}
      </div>
    </div>
  );
}

export interface LeadCardProps {
  lead: LeadDto;
  /** This lead is the one currently loaded into the pitch rail. */
  selected?: boolean;
  /** A save / remove / status request for this lead is in flight. */
  busy?: boolean;
  onPitch: (lead: LeadDto) => void;
  /** Open the outreach draft for this lead. */
  onMessage: (lead: LeadDto) => void;
  onToggleSave: (lead: LeadDto) => void;
  onStatusChange: (lead: LeadDto, status: LeadStatus) => void;
  onShowVideos?: (lead: LeadDto) => void;
}

export function LeadCard({
  lead,
  selected = false,
  busy = false,
  onPitch,
  onMessage,
  onToggleSave,
  onStatusChange,
  onShowVideos,
}: LeadCardProps) {
  const website = safeHref(lead.website);
  const opportunity = scoreLead(lead);
  const phoneHref = lead.phone ? telHref(lead.phone) : null;
  const emailHref = lead.email ? mailHref(lead.email) : null;
  const place = [lead.address, lead.city].filter((part): part is string => !!part).join(", ");
  const hasContact = !!(lead.phone || website || lead.email || place);

  return (
    <article
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-3 rounded-q-400 border-q-thin bg-q-transparent-light-05 p-4 transition-colors duration-150 motion-reduce:transition-none",
        selected
          ? "border-q-brand-primary"
          : "border-q-border-subtle hover:border-q-border-strong",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Typography as="h3" variant="title-sm-semi-bold" color="primary" truncate>
            {lead.name}
          </Typography>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {lead.category ? <Tag color="neutral">{lead.category}</Tag> : null}
            {hasWebsite(lead) ? null : <Tag color="brand">No website</Tag>}
            {lead.saved ? <LeadStatusBadge status={lead.status} /> : null}
            {selected ? <Badge variant="limeSubtle" size="xs" text="Pitching" /> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Typography
            as="span"
            variant="caption-xs-regular"
            color={opportunity.tier === "high" ? "brand" : "tertiary"}
            className="tabular-nums"
            title={opportunity.reasons.join(" · ")}
          >
            {opportunity.score} · {OPPORTUNITY_TIER_LABELS[opportunity.tier]}
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled={busy}
            aria-label={lead.saved ? `Remove ${lead.name} from saved leads` : `Save ${lead.name}`}
            aria-pressed={lead.saved}
            onClick={() => onToggleSave(lead)}
            start={
              busy ? (
                <Loader size="xs" color="neutral" />
              ) : (
                <Icon
                  as={lead.saved ? BookmarkCheck : Bookmark}
                  size="sm"
                  color={lead.saved ? "brand" : "secondary"}
                />
              )
            }
          />
        </div>
      </header>

      {hasContact ? (
        <div className="flex flex-col gap-1.5">
          {place ? (
            <ContactRow icon={MapPin} label="Address">
              <span className="min-w-0 truncate">{place}</span>
            </ContactRow>
          ) : null}
          {lead.phone ? (
            <ContactRow icon={Phone} label="Phone">
              {phoneHref ? (
                <a href={phoneHref} className={LINK_CLASS}>
                  {lead.phone}
                </a>
              ) : (
                <span className="min-w-0 truncate">{lead.phone}</span>
              )}
            </ContactRow>
          ) : null}
          {website ? (
            <ContactRow icon={Globe} label="Website">
              <a href={website} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {hostLabel(website)}
              </a>
            </ContactRow>
          ) : null}
          {lead.email ? (
            <ContactRow icon={Mail} label="Email">
              {emailHref ? (
                <a href={emailHref} className={LINK_CLASS}>
                  {lead.email}
                </a>
              ) : (
                <span className="min-w-0 truncate">{lead.email}</span>
              )}
            </ContactRow>
          ) : null}
        </div>
      ) : (
        <Typography as="p" variant="caption-sm-regular" color="tertiary">
          No public contact details listed — the pitch video is a great first touch.
        </Typography>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant={selected ? "brandSoft" : "tertiary"}
          size="sm"
          className="min-w-0 flex-1"
          onClick={() => onPitch(lead)}
          start={<Icon as={Clapperboard} size="sm" />}
        >
          {selected ? "Selected" : "Pitch this lead"}
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          iconOnly
          aria-label={`Write a message to ${lead.name}`}
          onClick={() => onMessage(lead)}
          start={<Icon as={MessageSquareText} size="sm" />}
        />
        {lead.saved ? (
          <LeadStatusSelect
            value={lead.status}
            disabled={busy}
            ariaLabel={`Status for ${lead.name}`}
            onChange={(status) => onStatusChange(lead, status)}
          />
        ) : null}
        {lead.pitchCount > 0 && onShowVideos != null ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowVideos(lead)}
            start={<Icon as={Film} size="sm" />}
          >
            {lead.pitchCount === 1 ? "1 video" : `${lead.pitchCount} videos`}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

export interface SelectedLeadCardProps {
  lead: LeadDto | null;
  onClear: () => void;
  onBrowse: () => void;
}

/** The rail's "who are we pitching" slot — the lead's name feeds the script. */
export function SelectedLeadCard({ lead, onClear, onBrowse }: SelectedLeadCardProps) {
  if (lead == null) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-q-400 border-q-thin border-dashed border-q-border-subtle px-4 py-5 text-center">
        <Icon as={Compass} size="md" color="secondary" />
        <div className="flex flex-col gap-0.5">
          <Typography as="p" variant="body-sm-semi-bold" color="primary">
            No lead selected
          </Typography>
          <Typography as="p" variant="caption-sm-regular" color="tertiary">
            Search below, then choose a business in the Leads tab. Its name goes straight into the script.
          </Typography>
        </div>
        <Button variant="ghost" size="sm" onClick={onBrowse} start={<Icon as={Compass} size="sm" />}>
          Browse leads
        </Button>
      </div>
    );
  }

  const detail = describeLead(lead);
  return (
    <div className="flex items-start gap-3 rounded-q-400 border-q-thin border-q-brand-primary bg-q-transparent-light-05 p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography as="span" variant="label-xs-medium" color="brand" className="uppercase">
          Pitching
        </Typography>
        <Typography as="p" variant="body-md-semi-bold" color="primary" truncate>
          {lead.name}
        </Typography>
        {detail ? (
          <Typography as="p" variant="caption-sm-regular" color="secondary" truncate>
            {detail}
          </Typography>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {lead.saved ? (
            <LeadStatusBadge status={lead.status} />
          ) : (
            <Typography as="span" variant="caption-xs-regular" color="tertiary">
              Saved to your leads when you generate
            </Typography>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Clear selected lead"
        onClick={onClear}
        start={<Icon as={X} size="sm" />}
      />
    </div>
  );
}
