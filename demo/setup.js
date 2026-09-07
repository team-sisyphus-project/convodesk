// Runs before the shipped dashboard entrypoint: installs the demo transport and
// the page globals that the Rails layout normally renders.
import axios from 'axios';
import Cookies from 'js-cookie';
import { fixtureFor } from './fixtures';
import { demoAdapter } from './transport';
import { resetDemo } from './state';

const globals = fixtureFor('/globals') ?? {};

window.chatwootConfig = {
  ...(globals.chatwootConfig ?? {}),
  // Same origin: the demo transport answers every request in the browser.
  hostURL: '',
  helpCenterURL: '',
  signupEnabled: 'false',
};
window.globalConfig = globals.globalConfig ?? {};
window.browserConfig = { browser_name: 'chrome' };
window.errorLoggingConfig = '';

// The dashboard only sends auth headers (and only calls /auth/validate_token)
// when this cookie is present.
Cookies.set(
  'cw_d_session_info',
  JSON.stringify({
    'access-token': 'demo-token',
    'token-type': 'Bearer',
    client: 'demo-client',
    expiry: `${Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30}`,
    uid: 'john@acme.inc',
  })
);

axios.defaults.adapter = demoAdapter;

// The dashboard registers /sw.js for web push. There is no push backend here,
// and the harness may serve the build from a sub-path, so the registration
// would only ever log a failure.
const demoServiceWorkerRegistration = {
  pushManager: {
    getSubscription: () => Promise.resolve(null),
    subscribe: () => Promise.reject(new Error('Push is disabled in the demo')),
    permissionState: () => Promise.resolve('denied'),
  },
  unregister: () => Promise.resolve(true),
  update: () => Promise.resolve(),
};

try {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register = () =>
      Promise.resolve(demoServiceWorkerRegistration);
  }
} catch {
  // Some browsers make the property read-only; the app already handles the
  // registration failing.
}

window.convodeskDemo = { reset: resetDemo };
