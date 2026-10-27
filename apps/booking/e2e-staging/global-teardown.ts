import globalSetup from "./global-setup";

// Tidy up straight after the check too, so "QA" sessions don't linger on staging while people test
// (opening one after it's removed shows "page not found").
export default globalSetup;
