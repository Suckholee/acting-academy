import {inject, track} from '@vercel/analytics';
import {isPublicVisit, sanitizeVisit} from './policy.cjs';
import {startDwellTracking} from './dwell.cjs';
import {browserSource} from './attribution.cjs';

if (window.top === window.self && isPublicVisit(window.location.href)) {
  window.kjtEntrySource=browserSource;
  browserSource();
  inject({
    mode: 'production',
    debug: false,
    beforeSend: event => isPublicVisit(window.location.href) ? sanitizeVisit(event) : null,
  });
  startDwellTracking((name,data)=>track(name,data));
}
