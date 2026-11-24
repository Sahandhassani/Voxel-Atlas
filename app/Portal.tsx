'use client';
import { useEffect } from 'react';
export default function Portal({ markup }: { markup: string }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module'; script.src = '/platform.js';
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);
  return <div id="portal-root" dangerouslySetInnerHTML={{ __html: markup }} />;
}
