'use client';

import { useActionState } from 'react';
import { login } from '../actions';

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action}>
      {state?.error && <p className="notice err">{state.error}</p>}
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoFocus required />
      <div className="row"><button disabled={pending}>{pending ? 'Checking…' : 'Log in'}</button></div>
    </form>
  );
}
