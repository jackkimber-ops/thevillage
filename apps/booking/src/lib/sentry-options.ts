// Shared Sentry settings for the browser and the server.
// Errors only, and no customer data: Sentry's defaults would send user info, cookies, headers,
// form bodies (names, phones, emails) and query strings (e.g. ?email= on the code page).
export const sentryOptions = {
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
};
