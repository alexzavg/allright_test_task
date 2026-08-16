import type { APIRequestContext, Page } from '@playwright/test'

const SESSION_STORAGE_KEY = 'ember_simple_auth-session'

export interface AuthSession {
  token: string
  userId: number
}

interface JsonApiResource {
  type: string
  id: string
  attributes: Record<string, unknown>
}

export interface TrialLesson {
  id: string
  startsAt: string
  tutorId?: string
}

export interface CurrentUser {
  id: number
  name: string
  meta: Record<string, unknown>
}

export async function readAuthSession(page: Page): Promise<AuthSession> {
  const raw = await page.evaluate(key => window.localStorage.getItem(key), SESSION_STORAGE_KEY)
  const authenticated = raw ? JSON.parse(raw).authenticated : undefined

  if (!authenticated?.access_token || !authenticated?.user_id) {
    throw new Error('The funnel finished without creating an authenticated user')
  }

  return { token: authenticated.access_token, userId: Number(authenticated.user_id) }
}

export class AllRightApi {
  private session?: AuthSession

  constructor(
    private readonly request: APIRequestContext,
    private readonly resolveSession: () => Promise<AuthSession>
  ) {}

  async userId(): Promise<number> {
    return (await this.authSession()).userId
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await this.request.get('/api/v1/users', {
      headers: await this.headers(),
      params: { me: 'true', include: 'UserMetum' },
    })

    if (!response.ok()) {
      throw new Error(`GET /api/v1/users?me=true failed with ${response.status()}`)
    }

    const body = await response.json()
    const user = body.data as JsonApiResource
    const meta = ((body.included ?? []) as JsonApiResource[]).find(
      resource => resource.type === 'user-meta'
    )

    return {
      id: Number(user.id),
      name: String(user.attributes['name'] ?? ''),
      meta: meta?.attributes ?? {},
    }
  }

  async getUpcomingTrialLessons(): Promise<TrialLesson[]> {
    const response = await this.request.get('/api/v1/lessons', {
      headers: await this.headers(),
      params: {
        'filter[user_id]': await this.userId(),
        'filter[upcomming][start]': new Date().toISOString(),
        'filter[lesson_type][]': 'lesson',
      },
    })

    if (!response.ok()) {
      throw new Error(`GET /api/v1/lessons failed with ${response.status()}`)
    }

    const lessons = ((await response.json()).data ?? []) as JsonApiResource[]

    return lessons.map(lesson => ({
      id: lesson.id,
      startsAt: String(lesson.attributes['time-start'] ?? ''),
      tutorId: lesson.attributes['tutor-id'] ? String(lesson.attributes['tutor-id']) : undefined,
    }))
  }

  private async authSession(): Promise<AuthSession> {
    return (this.session ??= await this.resolveSession())
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${(await this.authSession()).token}`,
      Accept: 'application/vnd.api+json',
    }
  }
}
