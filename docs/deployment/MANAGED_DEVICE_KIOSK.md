# Managed Device Kiosk Deployment

Assignment Hub provides an assessment **Focus Mode** that requests browser fullscreen and pauses the assessment view when the page is hidden or fullscreen is exited. This improves focus, but a website cannot prevent a learner from opening another application.

Actual app blocking must be configured by the school on managed devices.

## Recommended deployment

1. Enrol school tablets or laptops in a mobile-device-management (MDM) platform.
2. Publish Assignment Hub as the approved web app using the production school URL.
3. Configure single-app or kiosk mode for supervised assessment sessions.
4. Allow camera and file access so learners can upload handwritten graphs and practical work.
5. Allow the Assignment Hub frontend, API, file CDN and `cdn.jsdelivr.net` for the isolated Python runtime.
6. Test login, draft saving, final submission and graph upload on the exact managed device model before an exam.

## Platform options

- **Android Enterprise:** use dedicated-device or managed-home-screen mode and allowlist Assignment Hub.
- **ChromeOS:** use a kiosk web app or managed guest session restricted to Assignment Hub.
- **iPadOS:** supervise devices through Apple School Manager and an MDM, then enable Single App Mode for the installed web app/browser.
- **Windows:** use Assigned Access with Microsoft Edge configured for the Assignment Hub URL.

## Operational safeguards

- Do not describe Focus Mode events as proof of cheating. Calls, low-memory reloads, accessibility tools and file pickers can interrupt a browser.
- Keep draft saving available throughout the assessment.
- Provide a supervised recovery process for connectivity loss or device restart.
- Keep the API and S3 upload domains allowlisted; otherwise answers may appear to save locally while uploads fail.
- Pilot kiosk policies with one class before enabling them school-wide.
