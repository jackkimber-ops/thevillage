// Plain-English messages for the staff app (English only).
const MESSAGES: Record<string, string> = {
  overlap: "That time overlaps another session: there's one room.",
  capacity_below_booked: "Capacity can't be lower than the number already booked.",
  session_full: "That session is full. Capacity is never overridden.",
  already_booked: "They're already booked into this session.",
  managers_only: "Only a manager can do that.",
  not_allowed: "You can only change your own classes.",
  staff_only: "Staff only.",
  phone_exists: "A customer with this phone number already exists: search for them instead.",
  email_exists: "A customer with this email already exists: search for them instead.",
  invalid_phone: "Check the phone number.",
  invalid_email: "Check the email address.",
  name_required: "Add a name.",
  title_required: "Add a title.",
  invalid_time: "Check the date and time.",
  invalid_length: "Length must be between 15 minutes and 8 hours.",
  reason_required: "Please give a reason.",
  free_trial_used: "This customer has already had their free trial.",
  free_trial_class_only: "Free trials are for classes only.",
  intro_pack_new_customers_only: "The intro pack is only for customers who haven't had a pack before.",
  too_late_to_book: "Too close to the start: tick 'Override booking times' to book anyway.",
  too_far_ahead: "Beyond the booking window: tick 'Override booking times' to book anyway.",
  open_play_needs_a_child: "Open play needs at least one child.",
  too_many_children: "Up to 2 children per booking.",
  nothing_to_restore: "There's no used credit to restore on this booking.",
  already_restored: "That credit has already been restored.",
  session_closed: "This session has already closed.",
  choose_session: "Choose a session.",
  choose_customer: "Choose a customer.",
  repeat_too_long: "A repeat can run for up to a year.",
  must_extend: "The new end date must be later than the pack's current end date.",
  pack_not_found: "That pack wasn't found.",
};

export function staffError(code: string): string {
  if (code.startsWith("overlap:")) return `The session on ${code.slice(8)} overlaps another session, so nothing was created.`;
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
