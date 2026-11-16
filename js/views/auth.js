import { h } from '../ui.js';
import { app } from '../main.js';

/** Shown to anyone signed in to Google who isn't a teacher here or on a class list. */
export function viewNoAccess() {
  const email = app.store.lastEmail;
  return h('div.login-single',
    h('section.card.stack',
      h('h1', 'Into the Computer'),
      email
        ? [h('h2', "You're not on a class list yet"), h('p', 'You are signed in as ', h('strong', email), '. Ask your teacher to add this address to the class list, then reload this page.')]
        : [h('h2', "We couldn't tell who you are"), h('p', 'Make sure you are signed in with your school Google account, then reload this page.')],
    ));
}
