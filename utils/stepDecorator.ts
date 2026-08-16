import { test } from '@playwright/test'

type Method<This, Args extends unknown[], Return> = (this: This, ...args: Args) => Return

/**
 * Method decorator that runs a page-object method inside `test.step()`, so the HTML
 * report, trace viewer and UI mode read like the manual test case instead of a flat
 * list of `locator.click` / `expect.toBeVisible` calls.
 *
 *   @step() // auto-named from the method: "Choose age branch"
 *   async chooseAgeBranch(entry: FunnelEntry) {}
 *
 *   @step('Complete the quiz funnel') // static naming
 *   async complete(profile: QuizProfile) {}
 *
 *   @step('Open the {0.branch} funnel') // dynamic naming with args, optional property path
 *   async open(entry: FunnelEntry) {}
 *
 * Playwright transpiles specs with TC39 stage-3 decorators, so tsconfig needs no
 * `experimentalDecorators` flag. `test` comes from `@playwright/test` rather than the
 * fixture module to keep page objects out of the fixtures import cycle; `test.step()`
 * resolves the running test at call time either way.
 */
export function step(nameTemplate?: string) {
  return function <This, Args extends unknown[], Return>(
    target: Method<This, Args, Return>,
    context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>
  ): Method<This, Args, Promise<Awaited<Return>>> {
    const fallbackName = camelCaseToSentence(String(context.name))

    return async function (this: This, ...args: Args): Promise<Awaited<Return>> {
      if (!isInsideTest()) return await target.apply(this, args)

      const name = nameTemplate ? interpolate(nameTemplate, args) : fallbackName

      return await test.step(name, async () => target.apply(this, args))
    }
  }
}

// `test.step()` throws outside a running test (global setup, plain scripts). Skipping
// the wrapper there keeps the decorated method usable in those contexts.
function isInsideTest(): boolean {
  try {
    test.info()
    return true
  } catch {
    return false
  }
}

function interpolate(template: string, args: unknown[]): string {
  const placeholderPattern = /\{(\d+)((?:\.[\w$]+)*)\}/g

  return template.replace(
    placeholderPattern,
    (placeholder, index: string, path: string) => {
      const value = path
        .split('.')
        .filter(Boolean)
        .reduce<unknown>(
          (current, key) => (current as Record<string, unknown>)?.[key],
          args[+index]
        )

      return value === undefined ? placeholder : formatArg(value)
    }
  )
}

function formatArg(value: unknown): string {
  if (typeof value === 'string') return value

  // Locators and regexes stringify usefully; plain objects do not.
  const text = String(value)
  if (text !== '[object Object]') return text

  try {
    return JSON.stringify(value)
  } catch {
    return text
  }
}

function camelCaseToSentence(name: string): string {
  const spaced = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()

  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
