import { z } from 'zod'

const requiredText = z.string().trim().min(1)

export const onboardingFormSchema = z.object({
  nickname: requiredText,
  firstName: requiredText,
  lastName: requiredText,
  birthDate: z.date(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  school: z.object({ code: requiredText }),
  city: z.object({ name: requiredText }),
})

const eventCategorySchema = z.object({
  age_group: z.enum(['kids', 'junior', 'open', 'veterani']),
  team_format: z.enum(['1v1', '2v2', '3v3', '3v3g', '4v4', '5v5']),
  gender_category: z.enum(['muzi', 'zeny', 'mix']),
  fee: requiredText
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0)
    .transform(Number),
  capacity: requiredText
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0)
    .transform(Number),
})

export const eventCreationFormSchema = z
  .object({
    name: requiredText,
    eventType: z.enum(['TOURNAMENT', 'LEAGUE']),
    sport: requiredText,
    mode: z.enum(['TEAM', 'INDIVIDUAL']),
    eventDate: z.date(),
    eventTime: z.string(),
    region: requiredText,
    requiresCity: z.boolean(),
    city: z.object({ id: requiredText, name: requiredText }).nullable(),
    categories: z.array(eventCategorySchema),
  })
  .superRefine((value, context) => {
    if (value.requiresCity && !value.city) {
      context.addIssue({ code: 'custom', path: ['city'], message: 'required' })
    }
    if (
      value.eventType === 'TOURNAMENT' &&
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value.eventTime)
    ) {
      context.addIssue({ code: 'custom', path: ['eventTime'], message: 'invalid' })
    }
  })
