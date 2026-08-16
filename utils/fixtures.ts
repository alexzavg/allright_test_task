import { test as base, expect } from '@playwright/test'
import { PageManager } from './pageManager'
import { ApiManager } from './apiManager'

type TestFixtures = {
  pageManager: PageManager
  apiManager: ApiManager
}

export const test = base.extend<TestFixtures>({
  pageManager: async ({ page }, use) => {
    await use(new PageManager(page))
  },

  apiManager: async ({ request, page }, use) => {
    await use(new ApiManager(request, page))
  },
})

export { expect }
