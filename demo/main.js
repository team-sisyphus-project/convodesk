// Demo build entry. Import order matters: the setup module must finish before
// the dashboard entrypoint boots.
import './setup';
import '../app/javascript/entrypoints/dashboard.js';
