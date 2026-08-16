export interface QuizProfile {
  name: string
  emailDomain: string
  preferredAnswers: RegExp[]
}

export interface FunnelEntry {
  path: string
  ageOption: RegExp
  branch: string
}

export const TEEN_FUNNEL: FunnelEntry = {
  path: '/uk/app/sign-up/long/charlie/age-range',
  ageOption: /^13\+/,
  branch: '13+',
}

export const TEEN_PROFILE: QuizProfile = {
  name: 'Autotest',
  emailDomain: 'example.com',
  preferredAnswers: [/13\s?[-–]\s?15/],
}

export const MAX_FUNNEL_STEPS = 40
