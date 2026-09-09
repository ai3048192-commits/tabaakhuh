import '@testing-library/jest-dom/vitest'
import { expect, afterEach } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { cleanup } from '@testing-library/react'

expect.extend(axeMatchers)

afterEach(() => {
  cleanup()
  localStorage.clear()
})
