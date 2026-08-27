# Functional tests (Playwright)

Automated functional tests for the extension content script, background service
worker, MD5 signing, and an end-to-end extension-load test.

## Prerequisites

Node >= 18 and the Playwright Chromium browser are required:

    npm i -D playwright
    npx playwright install chromium

## Run

Build the extension (so dist/ is current for the E2E test) and run all suites:

    npm run build
    node test/content.test.cjs      # content script button scenarios (offline, mocked API)
    node test/background.test.cjs   # service worker checkLibrary / searchByTitle (offline, mocked fetch)
    node test/md5.test.cjs          # verifies the hand-rolled MD5 against RFC 1321 vectors
    node test/e2e.test.cjs          # loads dist/ extension in Chromium, E2E button injection

Or run everything with:

    npm test

## Notes

- The E2E test launches a headed Chromium with the extension loaded and routes
  book.douban.com and apps.jiatu.cloud requests locally, so it works fully offline.
- These tests only exercise the extension source; no runtime behavior of a live
  Douban/Beijing Library session is changed.