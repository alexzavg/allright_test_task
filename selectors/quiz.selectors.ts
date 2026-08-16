import type { Locator, Page } from '@playwright/test'

export const CTA_LABEL = /^(Далі|Продовжити|Зрозуміло|Почати|Готово|Забронювати урок)$/

export const NON_STEP_CONTROL_LABEL = /(звук відео|Intercom|Change country|^Close$|UTC)/i

export const TIME_SLOT_LABEL = /^\d{1,2}:\d{2}$/

export class QuizSelectors {
  constructor(private readonly page: Page) {}

  stepButtons(): Locator {
    return this.page
      .getByRole('button')
      .filter({ visible: true })
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: NON_STEP_CONTROL_LABEL })
  }

  optionButtons(): Locator {
    return this.stepButtons().filter({ hasNotText: CTA_LABEL })
  }

  ctaButton(): Locator {
    return this.page.getByRole('button', { name: CTA_LABEL }).filter({ visible: true })
  }

  dialogOptions(): Locator {
    return this.page.getByRole('dialog').getByRole('button').filter({ visible: true })
  }

  textInputs(): Locator {
    return this.page
      .locator('input:not([type="hidden"]):not([type="tel"])')
      .filter({ visible: true })
  }

  phoneInput(): Locator {
    return this.page.locator('input[type="tel"]').filter({ visible: true })
  }

  timeSlots(): Locator {
    return this.page.getByRole('button', { name: TIME_SLOT_LABEL }).filter({ visible: true })
  }

  bookingDays(): Locator {
    return this.page.getByRole('listitem').filter({ visible: true })
  }
}
