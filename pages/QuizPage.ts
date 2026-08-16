import { expect, type Locator, type Page } from '@playwright/test'
import { QuizSelectors } from '../selectors/quiz.selectors'
import { MAX_FUNNEL_STEPS, type FunnelEntry, type QuizProfile } from '../data/quiz.data'
import { buildUniqueEmail, buildUniquePhone } from '../utils/dataGenerator'
import { step } from '../utils/stepDecorator'

const STEP_TRANSITION_TIMEOUT = 20_000
const SELF_ADVANCE_TIMEOUT = 3_000
const PHONE_ENTRY_TIMEOUT = 30_000
const SUBMIT_TIMEOUT = 30_000
const SIGN_UP_PATH = '/app/sign-up/'
const ABORTED_PATH = '/app/login'

export type QuizOutcome = 'trial-booked' | 'request-submitted'

export interface QuizRunResult {
  outcome: QuizOutcome
  terminalPath: string
  phone: string
  email: string
}

export class QuizPage {
  private readonly selectors: QuizSelectors

  constructor(private readonly page: Page) {
    this.selectors = new QuizSelectors(page)
  }

  @step('Open the {0.branch} sign-up funnel')
  async open(entry: FunnelEntry): Promise<void> {
    await this.page.goto(entry.path)
    await expect(this.selectors.optionButtons().first()).toBeVisible()
  }

  @step('Choose the {0.branch} age branch')
  async chooseAgeBranch(entry: FunnelEntry): Promise<void> {
    const signature = await this.signature()
    await this.page.getByRole('button', { name: entry.ageOption }).click()

    if (!(await this.waitForScreenChange(signature, STEP_TRANSITION_TIMEOUT))) {
      throw new Error(`The "${entry.branch}" age option did not advance the funnel`)
    }
  }

  @step('Complete the quiz funnel')
  async complete(profile: QuizProfile): Promise<QuizRunResult> {
    const email = buildUniqueEmail(profile.emailDomain)
    let phone = ''

    for (let step = 0; step < MAX_FUNNEL_STEPS; step++) {
      await this.waitForScreenSettled()

      if (await this.isBookingScreen()) {
        await this.bookFirstAvailableSlot()

        return {
          outcome: 'trial-booked',
          terminalPath: this.currentPath(),
          phone,
          email,
        }
      }

      const signature = await this.signature()
      phone = (await this.answerCurrentScreen(profile, email)) ?? phone
      await this.waitForScreenChange(signature, STEP_TRANSITION_TIMEOUT)

      const next = this.currentPath()
      if (!next.includes(SIGN_UP_PATH)) {
        if (next.includes(ABORTED_PATH)) {
          throw new Error(
            `The funnel aborted to ${next}; the phone ${phone} is already in use`
          )
        }

        return {
          outcome: 'request-submitted',
          terminalPath: next,
          phone,
          email,
        }
      }
    }

    throw new Error(`The funnel did not finish within ${MAX_FUNNEL_STEPS} steps`)
  }

  @step()
  private async answerCurrentScreen(
    profile: QuizProfile,
    email: string
  ): Promise<string | undefined> {
    const dialogOptions = this.selectors.dialogOptions()
    if (await dialogOptions.count()) {
      await dialogOptions.first().click()
      return undefined
    }

    if (await this.selectors.phoneInput().count()) {
      return this.fillPhoneScreen()
    }

    const inputs = this.selectors.textInputs()
    if (await inputs.count()) {
      await this.fillTextScreen(inputs, profile, email)
      return undefined
    }

    if (await this.selectors.optionButtons().count()) {
      await this.chooseOption(profile)
      return undefined
    }

    const cta = this.selectors.ctaButton()
    if (await cta.count()) await this.submitScreen()

    return undefined
  }

  @step()
  private async fillTextScreen(
    inputs: Locator,
    profile: QuizProfile,
    email: string
  ): Promise<void> {
    const count = await inputs.count()

    for (let index = 0; index < count; index++) {
      const input = inputs.nth(index)
      await input.fill((await this.isEmailField(input)) ? email : profile.name)
    }

    await this.submitScreen()
  }

  private async isEmailField(input: Locator): Promise<boolean> {
    const type = (await input.getAttribute('type')) ?? ''
    const placeholder = (await input.getAttribute('placeholder')) ?? ''

    return type === 'email' || /mail/i.test(placeholder)
  }

  @step()
  private async fillPhoneScreen(): Promise<string> {
    const input = this.selectors.phoneInput().first()
    await expect(input).toHaveAttribute('placeholder', /^\+\d/)

    const phone = buildUniquePhone((await input.getAttribute('placeholder')) ?? '')

    await expect(async () => {
      await input.click()
      await input.press('ControlOrMeta+a')
      await input.press('Backspace')
      await input.pressSequentially(phone.nationalDigits, { delay: 30 })
      await expect(this.selectors.ctaButton().last()).toBeEnabled({ timeout: 2_000 })
    }).toPass({ timeout: PHONE_ENTRY_TIMEOUT })

    await this.submitScreen()

    return phone.formatted
  }

  @step()
  private async chooseOption(profile: QuizProfile): Promise<void> {
    const signature = await this.signature()
    await (await this.preferredOption(profile)).click()

    if (await this.waitForScreenChange(signature, SELF_ADVANCE_TIMEOUT)) return

    if (await this.selectors.ctaButton().count()) await this.submitScreen()
  }

  private async preferredOption(profile: QuizProfile): Promise<Locator> {
    const options = this.selectors.optionButtons()

    for (const answer of profile.preferredAnswers) {
      const match = options.filter({ hasText: answer })
      if (await match.count()) return match.first()
    }

    return options.first()
  }

  @step()
  private async submitScreen(): Promise<void> {
    const cta = this.selectors.ctaButton()

    await expect(async () => {
      await expect(cta).toHaveCount(1)
      await expect(cta).toBeEnabled({ timeout: 2_000 })
      await cta.click({ timeout: 5_000 })
    }).toPass({ timeout: SUBMIT_TIMEOUT })
  }

  private async isBookingScreen(): Promise<boolean> {
    return (await this.selectors.timeSlots().count()) > 0
  }

  @step()
  private async bookFirstAvailableSlot(): Promise<void> {
    const days = this.selectors.bookingDays()
    const dayCount = await days.count()

    for (let day = 0; day < Math.max(dayCount, 1); day++) {
      if (dayCount) await days.nth(day).click()

      if (await this.selectFirstEnabledSlot()) {
        const signature = await this.signature()
        await this.submitScreen()
        await this.waitForScreenChange(signature, STEP_TRANSITION_TIMEOUT)
        return
      }
    }

    throw new Error('No bookable time slot was offered on the booking screen')
  }

  private async selectFirstEnabledSlot(): Promise<boolean> {
    const slots = this.selectors.timeSlots()
    const count = await slots.count()

    for (let index = 0; index < count; index++) {
      const slot = slots.nth(index)
      if (await slot.isEnabled()) {
        await slot.click()
        return true
      }
    }

    return false
  }

  private async signature(): Promise<string> {
    const labels = await this.selectors.stepButtons().allInnerTexts()

    return `${this.currentPath()}::${labels.join('|')}`
  }

  private async waitForScreenSettled(): Promise<void> {
    let previous = ''

    await expect
      .poll(
        async () => {
          const current = await this.signature()
          const settled = current !== '' && current === previous
          previous = current

          return settled
        },
        { timeout: STEP_TRANSITION_TIMEOUT, intervals: [250] }
      )
      .toBe(true)
  }

  private async waitForScreenChange(previous: string, timeout: number): Promise<boolean> {
    try {
      await expect.poll(() => this.signature(), { timeout }).not.toBe(previous)
      return true
    } catch {
      return false
    }
  }

  private currentPath(): string {
    return new URL(this.page.url()).pathname
  }
}
