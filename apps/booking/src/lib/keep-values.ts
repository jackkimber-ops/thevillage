import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a server action without React clearing it afterwards. React 19 resets a
 * `<form action>` once the action finishes, so an error (wrong phone, bot check, "already booked")
 * would wipe everything the person typed. Use as `onSubmit={keepValues(action)}`.
 */
export function keepValues(action: (form: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(form));
  };
}
