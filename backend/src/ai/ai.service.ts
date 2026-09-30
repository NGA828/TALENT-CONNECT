import { Injectable } from '@nestjs/common';
import { splitSkills } from '../auth/auth.service';
import { AuthUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDto } from './dto/ai.dto';
import { AiChatMessage, AiContext, AiProvider, AiTask } from './providers/ai.provider';
import { AI_PROVIDER_LABELS, AiProviderId } from './providers/ai-config';

const SYSTEM_PROMPT = `You are "Connect AI", the assistant inside Talent Connect – a platform where talents (photographers, DJs, dancers, musicians, hosts…) build portfolios, enroll in events and sign contracts with promoters.
Rules: be concise, practical and professional. Write in the user's language. Never invent facts about the user – use only the profile data provided. Do not ask for or reveal passwords, payment or personal data. If asked about something unrelated to a talent's career or the platform, politely steer back.
Platform facts: talents enroll in published events; promoters create contracts (PENDING→ACTIVE when the talent accepts; COMPLETED, CANCELLED or REJECTED otherwise); promoters must have a verified licence; ratings come from promoters after completed contracts; portfolio uploads accept images, video, audio and PDF and are moderated by administrators. Money on the platform is in CFA francs (XAF, written FCFA) with no decimals; the promoter licence fee is set by the platform administrators and paid with Mobile Money — MTN MoMo via *126# or Orange Money via #150# — to the merchant number the administrators publish, after which an administrator confirms the transfer before the licence can be approved. Talents never pay to use the platform.`;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProvider,
  ) {}

  status() {
    const name = this.provider.name as AiProviderId;
    return {
      provider: this.provider.name,
      providerLabel: AI_PROVIDER_LABELS[name] ?? this.provider.name,
      live: this.provider.live,
      model: this.provider.model,
      mode: this.provider.live ? 'live' : 'offline',
    };
  }

  async history(userId: string) {
    const rows = await this.prisma.aiMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 60 });
    return rows.reverse();
  }

  async clear(userId: string) {
    const r = await this.prisma.aiMessage.deleteMany({ where: { userId } });
    return { deleted: r.count };
  }

  private inferTask(text: string): AiTask {
    const q = text.toLowerCase();
    if (/\bbio\b|about me|summary of me/.test(q)) return 'IMPROVE_BIO';
    if (/portfolio|caption|describe (this|my) (work|photo|video)/.test(q)) return 'PORTFOLIO_DESCRIPTION';
    if (/(write|draft).*(message|email)|reach out/.test(q)) return 'MESSAGE_DRAFT';
    if (/prepare|checklist|event requirement/.test(q)) return 'EVENT_ADVICE';
    if (/present.*skill|skills/.test(q)) return 'SKILLS_PRESENTATION';
    return 'GENERAL';
  }

  private async buildContext(user: AuthUser, eventId?: string): Promise<AiContext> {
    const t = await this.prisma.talent.findUniqueOrThrow({ where: { id: user.talentId! }, include: { user: true } });
    let event: AiContext['event'] = null;
    if (eventId) {
      const e = await this.prisma.event.findFirst({ where: { id: eventId, status: { not: 'DRAFT' } }, include: { promoter: { select: { agencyName: true } } } });
      if (e) event = { title: e.title, location: e.location, eventDate: e.eventDate, category: e.category, description: e.description, talentNeeded: e.talentNeeded, agencyName: e.promoter.agencyName };
    }
    return { name: `${t.user.firstName} ${t.user.lastName}`, specialization: t.specialization, bio: t.bio, skills: splitSkills(t.skills), location: t.location, experienceYears: t.experienceYears, event };
  }

  async chat(user: AuthUser, dto: ChatDto) {
    const task = dto.task ?? this.inferTask(dto.message);
    const context = await this.buildContext(user, dto.eventId);
    const past = await this.prisma.aiMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 8 });

    const profile = `Talent profile → name: ${context.name}; specialization: ${context.specialization}; location: ${context.location ?? 'n/a'}; experience: ${context.experienceYears ?? 'n/a'} years; skills: ${context.skills.join(', ') || 'n/a'}; current bio: ${context.bio ?? 'none'}.`;
    const eventInfo = context.event
      ? `Selected event → "${context.event.title}" by ${context.event.agencyName}, ${context.event.location}, ${context.event.eventDate.toISOString().slice(0, 10)}, category ${context.event.category ?? 'n/a'}, looking for: ${context.event.talentNeeded ?? 'n/a'}. Description: ${context.event.description}`
      : '';
    const messages: AiChatMessage[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${profile}\n${eventInfo}\nCurrent task: ${task}.` },
      ...past.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: dto.message },
    ];

    const reply = await this.provider.complete({ task, messages, context });
    await this.prisma.aiMessage.createMany({
      data: [
        { userId: user.id, role: 'user', content: dto.message, task },
        { userId: user.id, role: 'assistant', content: reply, task },
      ],
    });
    return { reply, task, ...this.status() };
  }
}
