import { expect, test } from '../utils/fixtures'
import { TEEN_FUNNEL, TEEN_PROFILE } from '../data/quiz.data'
import type { TrialLesson } from '../utils/api'
import { tags } from '../utils/tags'

test.describe('Sign-up quiz', () => {
  test(
    `A ${TEEN_FUNNEL.branch} visitor who finishes the quiz gets an account and a trial lesson`,
    { tag: [tags.SMOKE, tags.REGRESSION] },
    async ({ pageManager, apiManager }) => {
      await test.step(`Enter the funnel and pick the ${TEEN_FUNNEL.branch} age branch`, async () => {
        await pageManager.quiz.open(TEEN_FUNNEL)
        await pageManager.quiz.chooseAgeBranch(TEEN_FUNNEL)
      })

      const run =
        await test.step('Answer every screen the funnel shows until it finishes', () => {
          return pageManager.quiz.complete(TEEN_PROFILE)
        })

      await test.step('Verify an account was created and the quiz answers were persisted', async () => {
        const user = await apiManager.allRight.getCurrentUser()

        expect(user.id).toBe(await apiManager.allRight.userId())
        expect(user.name).toBe(TEEN_PROFILE.name)
        expect(Object.keys(user.meta['funnel-data'] ?? {})).not.toHaveLength(0)
      })

      await test.step(`Verify the trial outcome: ${run.outcome}`, async () => {
        if (run.outcome === 'trial-booked') {
          let lessons: TrialLesson[] = []

          await expect
            .poll(
              async () =>
                (lessons = await apiManager.allRight.getUpcomingTrialLessons()).length,
              {
                timeout: 20_000,
              }
            )
            .toBeGreaterThan(0)

          expect(new Date(lessons[0].startsAt).getTime()).toBeGreaterThan(Date.now())
          expect(lessons[0].tutorId).toBeDefined()
        } else {
          expect(await apiManager.allRight.getUpcomingTrialLessons()).toHaveLength(0)
        }
      })

      test
        .info()
        .annotations.push(
          { type: 'outcome', description: run.outcome },
          { type: 'user id', description: String(await apiManager.allRight.userId()) },
          { type: 'phone', description: run.phone }
        )
    }
  )
})
