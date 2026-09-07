// There is no Rails server in the demo build, so ActionCable would retry a
// websocket forever. This keeps the consumer API shape (including the mixin
// that BaseActionCableConnector passes to subscriptions.create) and does
// nothing.
const noop = () => {};

export const createConsumer = () => ({
  subscriptions: {
    subscriptions: [],
    create: (_params, mixin = {}) =>
      Object.assign(
        {
          unsubscribe: noop,
          perform: noop,
          send: noop,
        },
        mixin
      ),
  },
  connect: noop,
  disconnect: noop,
});

export default { createConsumer };
