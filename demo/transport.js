// The single seam between the shipped dashboard and its backend: an axios
// adapter. Every API class in the app goes through one axios instance, so
// replacing the adapter reroutes the whole app to the in-browser dataset while
// stores, components, routing and error handling stay exactly as shipped.
import { fixtureFor, fixtureForPathname } from './fixtures';
import {
  ACCOUNT_ID,
  currentUser,
  db,
  findConversation,
  persist,
  touchConversation,
} from './state';

const ok = (config, data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config,
  request: {},
});

const fail = (config, status, data) => {
  const error = new Error(`Demo transport: ${status} ${config.url}`);
  error.config = config;
  error.response = { status, data, config, headers: {} };
  return Promise.reject(error);
};

const readBody = data => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return Object.fromEntries(data.entries());
  }
  return data;
};

const agentFor = user => ({
  id: user.id,
  name: user.name,
  available_name: user.available_name,
  avatar_url: user.avatar_url,
  type: 'user',
  availability_status: 'online',
  thumbnail: user.avatar_url,
});

const routes = [
  {
    method: 'get',
    match: /^\/auth\/validate_token$/,
    handle: () => fixtureFor('/auth/validate_token'),
  },
  {
    method: 'put',
    match: /^\/api\/v1\/profile(\/set_active_account)?$/,
    handle: () => currentUser(),
  },
  {
    method: 'get',
    match: /^\/api\/v1\/accounts\/\d+\/conversations$/,
    handle: ({ query }) => {
      const status = query.get('status') || 'open';
      const assigneeType = query.get('assignee_type') || 'all';
      const inboxId = query.get('inbox_id');
      const labels = query.getAll('labels[]');
      const user = currentUser();

      const conversations = db.conversations.filter(conversation => {
        if (status !== 'all' && conversation.status !== status) return false;
        if (inboxId && conversation.inbox_id !== Number(inboxId)) return false;
        if (labels.length && !labels.every(l => (conversation.labels || []).includes(l)))
          return false;
        const assigneeId = conversation.meta?.assignee?.id;
        if (assigneeType === 'me' && assigneeId !== user.id) return false;
        if (assigneeType === 'unassigned' && assigneeId) return false;
        if (assigneeType === 'assigned' && !assigneeId) return false;
        return true;
      });

      const page = Number(query.get('page') || 1);
      const payload = page > 1 ? [] : conversations;
      return { data: { meta: counts(), payload } };
    },
  },
  {
    method: 'get',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/meta$/,
    handle: () => ({ meta: counts() }),
  },
  {
    method: 'get',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/messages$/,
    handle: ({ params }) => ({
      meta: db.conversationMeta[params[0]] ?? {},
      payload: db.messages[params[0]] ?? [],
    }),
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/messages$/,
    handle: ({ params, body }) => {
      const conversationId = Number(params[0]);
      const conversation = findConversation(conversationId);
      const user = currentUser();
      const message = {
        id: db.nextMessageId++,
        content: body.content ?? '',
        account_id: ACCOUNT_ID,
        inbox_id: conversation?.inbox_id ?? 1,
        conversation_id: conversationId,
        message_type: body.private ? 1 : 1,
        content_type: 'text',
        content_attributes: body.content_attributes ?? {},
        created_at: Math.floor(Date.now() / 1000),
        private: Boolean(body.private),
        status: 'sent',
        source_id: null,
        sender: agentFor(user),
        sender_type: 'User',
        sender_id: user.id,
        echo_id: body.echo_id,
        attachments: [],
        conversation: { assignee_id: conversation?.meta?.assignee?.id ?? null },
      };
      db.messages[conversationId] = [...(db.messages[conversationId] ?? []), message];
      if (conversation) {
        conversation.messages = [message];
        conversation.last_non_activity_message = message;
        conversation.unread_count = 0;
        touchConversation(conversation);
      }
      persist();
      return message;
    },
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/toggle_status$/,
    handle: ({ params, body }) => {
      const conversation = findConversation(params[0]);
      if (!conversation) return {};
      conversation.status =
        body.status ?? (conversation.status === 'open' ? 'resolved' : 'open');
      if (body.snoozed_until) conversation.snoozed_until = body.snoozed_until;
      touchConversation(conversation);
      persist();
      return { payload: { conversation_id: conversation.id, current_status: conversation.status } };
    },
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/toggle_priority$/,
    handle: ({ params, body }) => {
      const conversation = findConversation(params[0]);
      if (conversation) {
        conversation.priority = body.priority ?? null;
        touchConversation(conversation);
        persist();
      }
      return {};
    },
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/assignments$/,
    handle: ({ params, body }) => {
      const conversation = findConversation(params[0]);
      if (!conversation) return {};
      const user = currentUser();
      const assignee = body.assignee_id ? agentFor(user) : null;
      conversation.meta = { ...conversation.meta, assignee };
      touchConversation(conversation);
      persist();
      return assignee ?? {};
    },
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/labels$/,
    handle: ({ params, body }) => {
      const conversation = findConversation(params[0]);
      if (conversation) {
        conversation.labels = body.labels ?? [];
        persist();
      }
      return { payload: conversation?.labels ?? [] };
    },
  },
  {
    method: 'get',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/labels$/,
    handle: ({ params }) => ({
      payload: findConversation(params[0])?.labels ?? [],
    }),
  },
  {
    method: 'post',
    match: /^\/api\/v1\/accounts\/\d+\/conversations\/(\d+)\/update_last_seen$/,
    handle: ({ params }) => {
      const conversation = findConversation(params[0]);
      if (conversation) {
        conversation.unread_count = 0;
        persist();
      }
      return {};
    },
  },
];

const counts = () => {
  const user = currentUser();
  const open = db.conversations.filter(c => c.status === 'open');
  return {
    mine_count: open.filter(c => c.meta?.assignee?.id === user.id).length,
    assigned_count: open.filter(c => c.meta?.assignee?.id).length,
    unassigned_count: open.filter(c => !c.meta?.assignee?.id).length,
    all_count: open.length,
  };
};

const buildUrl = config => {
  const url = new URL(config.url, window.location.origin);
  Object.entries(config.params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach(v => url.searchParams.append(`${key}[]`, v));
    else url.searchParams.append(key, value);
  });
  return url;
};

export const demoAdapter = config => {
  const url = buildUrl(config);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const method = (config.method ?? 'get').toLowerCase();
  const body = readBody(config.data);

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.match);
    if (!match) continue;
    return Promise.resolve(
      ok(config, route.handle({ params: match.slice(1), query: url.searchParams, body, config }))
    );
  }

  if (method === 'get') {
    const exact = fixtureFor(`${pathname}${url.search}`) ?? fixtureForPathname(pathname);
    if (exact !== undefined) return Promise.resolve(ok(config, exact));
  }

  if (method !== 'get') {
    // Writes the demo does not model yet are accepted so the UI stays usable.
    // eslint-disable-next-line no-console
    console.warn(`[demo] unhandled ${method.toUpperCase()} ${pathname} - returning empty 200`);
    return Promise.resolve(ok(config, {}));
  }

  // eslint-disable-next-line no-console
  console.warn(`[demo] no fixture for GET ${pathname}${url.search}`);
  return fail(config, 404, { error: 'Not available in the demo build' });
};
