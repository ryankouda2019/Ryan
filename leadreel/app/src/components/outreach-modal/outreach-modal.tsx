import { useEffect, useState } from "react";
import { Check, Clapperboard, Copy, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@higgsfield/quanta/button";
import { Icon } from "@higgsfield/quanta/icon";
import { Input } from "@higgsfield/quanta/input";
import { Modal } from "@higgsfield/quanta/modal";
import { Tabs } from "@higgsfield/quanta/tabs";
import { Textarea } from "@higgsfield/quanta/textarea";
import { Typography } from "@higgsfield/quanta/typography";
import { toast } from "@higgsfield/quanta/sonner";
import {
  buildOutreach,
  describeLead,
  type LeadDto,
  type PitchProfile,
} from "@/lib/leads.shared";

/**
 * OutreachModal — the message that travels with the pitch video. The draft is
 * built from the lead's own listing plus the user's saved pitch, then handed
 * over as editable text: nobody sends a template unread, so the point is a
 * strong first draft the user adjusts and copies, not a send button.
 */

export interface OutreachModalProps {
  /** The lead to write to. `null` keeps the dialog closed. */
  lead: LeadDto | null;
  profile: Pick<PitchProfile, "senderName" | "offer">;
  onOpenChange: (open: boolean) => void;
  /** Load this lead into the pitch rail and close. */
  onPitch: (lead: LeadDto) => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={() => {
        void copyText(value).then((ok) => {
          if (ok) {
            setCopied(true);
            toast.success(`${label} copied`);
          } else {
            toast.error("Couldn't reach the clipboard — select the text and copy it manually.");
          }
        });
      }}
      start={<Icon as={copied ? Check : Copy} size="sm" />}
    >
      {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
    </Button>
  );
}

export function OutreachModal({ lead, profile, onOpenChange, onPitch }: OutreachModalProps) {
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [sms, setSms] = useState("");

  // Re-draft whenever a different lead opens the dialog; edits live until then.
  useEffect(() => {
    if (lead == null) return;
    const draft = buildOutreach(lead, profile);
    setSubject(draft.subject);
    setEmail(draft.email);
    setSms(draft.sms);
  }, [lead, profile]);

  const detail = lead != null ? describeLead(lead) : "";

  return (
    <Modal.Root open={lead != null} onOpenChange={onOpenChange}>
      <Modal.Content size="lg">
        <Modal.Header>
          <Modal.Title>{lead != null ? `Message ${lead.name}` : "Message"}</Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <Typography as="p" variant="body-sm-regular" color="secondary">
              {detail !== ""
                ? `Written from this ${detail} listing and your saved pitch. Edit anything before you send it.`
                : "Written from this listing and your saved pitch. Edit anything before you send it."}
            </Typography>

            <Tabs.Root variant="segmented" defaultValue="email" className="flex! flex-col gap-3">
              <Tabs.List
                items={[
                  { value: "email", label: "Email", start: <Icon size="sm" as={Mail} /> },
                  { value: "sms", label: "Text message", start: <Icon size="sm" as={MessageSquareText} /> },
                ]}
              />

              <Tabs.Panel value="email" className="flex flex-col gap-3 pt-0">
                <Input
                  label="Subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
                <Textarea
                  label="Email"
                  rows={12}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton value={subject} label="Subject" />
                  <CopyButton value={email} label="Email" />
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="sms" className="flex flex-col gap-3 pt-0">
                <Textarea
                  label="Text message"
                  description={`${sms.length} characters — keep it under about 320 to stay in two segments.`}
                  rows={5}
                  value={sms}
                  onChange={(event) => setSms(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton value={sms} label="Message" />
                </div>
              </Tabs.Panel>
            </Tabs.Root>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Modal.FooterActions>
            <Modal.Close render={<Button variant="tertiary" size="md">Close</Button>} />
            <Button
              variant="brandSoft"
              size="md"
              onClick={() => {
                if (lead != null) onPitch(lead);
              }}
              start={<Icon as={Clapperboard} size="sm" />}
            >
              Make the video
            </Button>
          </Modal.FooterActions>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
