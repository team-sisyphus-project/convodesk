// The demo dataset: seeded from the captured fixtures, mutated in the browser
// and persisted to localStorage so a reload keeps whatever the visitor did.
import { fixtureFor } from './fixtures';

const STORAGE_KEY = 'convodesk-demo-state-v1';
const CONVERSATIONS_PATH =
  '/api/v1/accounts/1/conversations?status=all&assignee_type=all&page=1&sort_by=last_activity_at_desc';

export const ACCOUNT_ID = 1;

const seed = () => {
  const conversations = structuredClone(
    fixtureFor(CONVERSATIONS_PATH)?.data?.payload ?? []
  );
  const messages = {};
  const conversationMeta = {};
  conversations.forEach(conversation => {
    const fixture = fixtureFor(
      `/api/v1/accounts/1/conversations/${conversation.id}/messages`
    );
    messages[conversation.id] = structuredClone(fixture?.payload ?? []);
    conversationMeta[conversation.id] = structuredClone(fixture?.meta ?? {});
  });
  const ids = Object.values(messages)
    .flat()
    .map(message => message.id);
  return {
    conversations,
    messages,
    conversationMeta,
    nextMessageId: (ids.length ? Math.max(...ids) : 0) + 1,
  };
};

const load = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // A private window or blocked storage just means a fresh demo every load.
  }
  return seed();
};

export const db = load();

export const persist = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore: the demo still works for this page view.
  }
};

export const resetDemo = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
  window.location.reload();
};

export const currentUser = () => fixtureFor('/auth/validate_token')?.payload?.data;

export const findConversation = id =>
  db.conversations.find(conversation => conversation.id === Number(id));

export const touchConversation = conversation => {
  const now = Math.floor(Date.now() / 1000);
  conversation.last_activity_at = now;
  conversation.timestamp = now;
  conversation.updated_at = now;
};
