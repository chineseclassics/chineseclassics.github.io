import { optimizeForIframe } from './utils/iframe.js';
import { initializeApp } from './main.js';

optimizeForIframe();
document.addEventListener('DOMContentLoaded', initializeApp);
