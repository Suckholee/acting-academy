const publicHosts = new Set(['kactstar.com', 'www.kactstar.com']);

function isPublicVisit(value) {
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname).replace(/\.html$/i, '');
    return url.protocol === 'https:' && publicHosts.has(url.host)
      && !url.searchParams.has('admin') && !url.searchParams.has('preview')
      && !/^\/(admin|api|materials|login|signup|account|reset-password|auth)(\/|$)/i.test(pathname);
  } catch {
    return false;
  }
}

function sanitizeVisit(event) {
  if (!['pageview','event'].includes(event.type) || !isPublicVisit(event.url)) return null;
  const url = new URL(event.url);
  // Count the public page without query values, access tokens, or fragments.
  return {...event, url: url.origin + url.pathname};
}

module.exports = {isPublicVisit, sanitizeVisit};
