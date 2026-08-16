import type { Page } from '@playwright/test'
import { QuizPage } from '../pages/QuizPage'

export class PageManager {
  private quizPage?: QuizPage

  constructor(private readonly page: Page) {}

  get quiz(): QuizPage {
    return (this.quizPage ??= new QuizPage(this.page))
  }
}
