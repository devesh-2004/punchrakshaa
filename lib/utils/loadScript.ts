export function loadScript(src: string) {
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

