import { Injectable } from '@nestjs/common';
import { AiContext, AiProvider, AiRequest, AiTask } from './ai.provider';

const FAQ: { keys: string[]; answer: string }[] = [
  { keys: ['enroll', 'apply', 'join event', 'sign up for'], answer: 'To enroll in an event: open **Events**, pick a published event, review the details and click **Enroll**. You can withdraw later unless you already have an active contract for it. The organiser is notified instantly.' },
  { keys: ['contract', 'agreement', 'terms', 'sign'], answer: 'Contracts are created by promoters and appear under **Contracts**. Open one to read the terms, fee and any document. You can **accept** it (status becomes ACTIVE) or **decline** it with a short note. Only the promoter can edit the terms; if they change an active contract it returns to PENDING for your confirmation.' },
  { keys: ['rating', 'review', 'stars'], answer: 'Promoters can rate you once a contract with them is marked **completed**. Your average, distribution and written reviews are on the **Ratings** page. The best way to improve them: deliver on time, communicate clearly and keep your portfolio current.' },
  { keys: ['portfolio', 'upload', 'media'], answer: 'Add work under **Portfolio → Add item**. Images (10 MB), video (50 MB), audio (20 MB) and PDFs (10 MB) are supported. Only published items that pass moderation are visible to promoters. Use descriptive titles and mention the client, role and result.' },
  { keys: ['verify', 'verified', 'licence', 'license'], answer: 'Promoters must submit a licence, pay the licence fee and be approved by an administrator before they can publish events or create contracts. Look for the **Verified** badge on an organiser before accepting work.' },
  { keys: ['pay', 'payment', 'fee', 'invoice', 'momo', 'mobile money', 'orange money'], answer: 'Talents never pay to use Talent Connect. The only platform fee is the promoter licence fee, charged in FCFA and paid with Mobile Money – MTN MoMo (`*126#`) or Orange Money (`#150#`) – to the merchant number the administrators publish; an administrator then confirms the transfer. Compensation for a booking is agreed in the contract, so always confirm the amount and payment date in the contract terms before accepting.' },
  { keys: ['message', 'chat', 'contact'], answer: 'Use **Messages** to talk to promoters. You can reply to any promoter who wrote to you, or start a chat from an event page with **Contact organiser**.' },
  { keys: ['profile', 'complete', 'percent'], answer: 'Your profile completion is based on ten items: photo, phone, gender, specialization, a bio of 40+ characters, location, 3+ skills, experience, and 1 and 3 published portfolio items.' },
];

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(c) ? c : `${c}.`;
};
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

/**
 * Offline assistant used when no AI_API_KEY is configured. It is a transparent, rule-based
 * writing helper (templates filled with the talent's own profile data) – not a language model.
 * The UI labels replies from this provider as "Offline mode".
 */
@Injectable()
export class OfflineAssistantProvider extends AiProvider {
  readonly name = 'offline';
  readonly live = false;
  readonly model = 'rule-based';

  async complete(req: AiRequest): Promise<string> {
    const last = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const c = req.context;
    switch (req.task) {
      case 'IMPROVE_BIO': return this.bio(c, last);
      case 'PORTFOLIO_DESCRIPTION': return this.portfolio(c, last);
      case 'MESSAGE_DRAFT': return this.message(c, last);
      case 'EVENT_ADVICE': return this.eventAdvice(c, last);
      case 'SKILLS_PRESENTATION': return this.skills(c);
      default: return this.general(c, last);
    }
  }

  private bio(c: AiContext, input: string) {
    const draft = input.length > 25 && !/^(improve|write|help)/i.test(input) ? input : c.bio ?? '';
    const parts: string[] = [];
    const exp = c.experienceYears ? `${c.experienceYears}+ years of experience` : 'a growing track record';
    parts.push(`${c.name} is ${article(c.specialization)} ${c.specialization.toLowerCase()}${c.location ? ` based in ${c.location}` : ''} with ${exp}.`);
    if (c.skills.length) parts.push(`Known for ${list(c.skills.slice(0, 4))}, ${c.name.split(' ')[0]} brings reliability and a clear creative point of view to every booking.`);
    if (draft) {
      const extra = draft.split(/(?<=[.!?])\s+/).map(sentence).filter(Boolean).slice(0, 2).join(' ');
      if (extra && !parts.join(' ').includes(extra)) parts.push(extra);
    }
    parts.push('Open to events, brand collaborations and long-term partnerships – message me on Talent Connect to discuss your next project.');
    return `Here is a polished bio you can use:\n\n> ${parts.join(' ')}\n\n**Tips:** lead with what you do and for whom, add one concrete achievement (a client, venue or number), and keep it under 600 characters. Click **Use as my bio** to apply it.`;
  }

  private portfolio(c: AiContext, input: string) {
    const notes = input.replace(/^(suggest|write|improve)[^:]*:?/i, '').trim();
    const core = notes ? sentence(notes) : `A showcase of my ${c.specialization.toLowerCase()} work.`;
    return `Suggested description:\n\n> ${core} Created by ${c.name}, ${c.specialization}${c.location ? ` (${c.location})` : ''}. ${c.skills.length ? `Skills highlighted: ${list(c.skills.slice(0, 3))}. ` : ''}Available for similar projects – get in touch via Talent Connect.\n\n**Make it stronger:** name the client or event, your exact role, the date, and one result (audience size, publication, award).`;
  }

  private message(c: AiContext, input: string) {
    const event = c.event;
    const subject = event ? `your event "${event.title}"` : 'an upcoming opportunity';
    const when = event ? ` on ${new Date(event.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
    const reason = input.length > 30 ? `\n\n${sentence(input)}` : '';
    return `Draft message:\n\n> Hello${event ? ` ${event.agencyName} team` : ''},\n>\n> I'm ${c.name}, ${article(c.specialization)} ${c.specialization.toLowerCase()}${c.location ? ` based in ${c.location}` : ''}. I'm very interested in ${subject}${when}.${c.skills.length ? ` I can bring ${list(c.skills.slice(0, 3))} to the project.` : ''} You can see my work in my Talent Connect portfolio.\n>\n> Could we schedule a short call to discuss scope, timing and compensation?\n>\n> Kind regards,\n> ${c.name}${reason}\n\nPaste it into **Messages** and adjust any detail to match your conversation.`;
  }

  private eventAdvice(c: AiContext, _input: string) {
    const e = c.event;
    if (!e) return 'Select an event first (use the event picker above the chat) and I will build a preparation checklist from its details.';
    const date = new Date(e.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return `**Preparation checklist – ${e.title}**\n\n- **When & where:** ${date}, ${e.location}. Plan travel and arrive at least 90 minutes before your slot.\n- **Organiser:** ${e.agencyName}${e.category ? ` · category: ${e.category}` : ''}.\n- **What they need:** ${e.talentNeeded ?? 'see the event description'}. ${c.specialization === (e.talentNeeded ?? '') ? 'You match this requirement directly.' : 'Explain in your message how your experience covers it.'}\n- **Before the day:** confirm fee, payment date, equipment and schedule in writing – ideally inside a Talent Connect contract.\n- **Bring:** your portfolio link, ID, backup equipment and a contact number for the organiser.\n- **After:** ask the promoter to mark the contract completed so they can leave you a rating.`;
  }

  private skills(c: AiContext) {
    const s = c.skills.length ? c.skills : ['add 3-5 core skills on your profile'];
    return `**How to present your skills as ${article(c.specialization)} ${c.specialization}:**\n\n1. **Lead with outcomes, not tools** – "${s[0]}" becomes "delivered ${s[0].toLowerCase()} for events of 500+ guests".\n2. **Group skills** into *core* (${list(s.slice(0, 2))}), *supporting* and *tools/equipment*.\n3. **Prove each skill** with a portfolio item – a photo, clip or PDF case study.\n4. **Mirror the event brief** – use the same words the promoter used in the event description.\n5. **Show range and reliability** – mention experience${c.experienceYears ? ` (${c.experienceYears}+ years)` : ''}, turnaround time and languages.`;
  }

  private general(c: AiContext, input: string) {
    const q = input.toLowerCase();
    const hit = FAQ.find((f) => f.keys.some((k) => q.includes(k)));
    if (hit) return hit.answer;
    if (/bio|about me|summary/.test(q)) return this.bio(c, input);
    if (/skill/.test(q)) return this.skills(c);
    if (/message|email|reach out|introduc/.test(q)) return this.message(c, input);
    return `I can help you with:\n\n- **Improve my bio** – a polished professional summary\n- **Portfolio descriptions** – captions that sell your work\n- **Draft a message** to a promoter\n- **Event preparation** – a checklist for an event you enrolled in\n- **Platform questions** – enrollment, contracts, ratings, verification\n\nTry one of the quick actions or ask "How do contracts work?".`;
  }
}

export const ALL_TASKS: AiTask[] = ['IMPROVE_BIO', 'PORTFOLIO_DESCRIPTION', 'MESSAGE_DRAFT', 'EVENT_ADVICE', 'SKILLS_PRESENTATION', 'GENERAL'];
