// src/hooks/useSEO.js
import { useEffect } from 'react';

export const useSEO = ({ title, description, image, url }) => {
  useEffect(() => {
    const siteName = 'GameStore VN';
    const fullTitle = title ? `${title} — ${siteName}` : siteName;
    document.title = fullTitle;

    const setMeta = (name, content, prop=false) => {
      if (!content) return;
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr,name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    if (image) setMeta('og:image', image, true);
    if (url)   setMeta('og:url',   url,   true);
    setMeta('og:type',     'website', true);
    setMeta('og:site_name', siteName, true);
  }, [title, description, image, url]);
};
