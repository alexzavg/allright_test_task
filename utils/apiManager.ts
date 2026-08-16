import type { APIRequestContext, Page } from '@playwright/test'
import { AllRightApi, readAuthSession } from './api'

export class ApiManager {
  private allRightApi?: AllRightApi

  constructor(
    private readonly request: APIRequestContext,
    private readonly page: Page
  ) {}

  get allRight(): AllRightApi {
    return (this.allRightApi ??= new AllRightApi(this.request, () =>
      readAuthSession(this.page)
    ))
  }
}
