/**
 * Keeps /jobs/ referral controls disabled until consent is ticked.
 * Nothing is stored or sent. Without JavaScript the buttons stay disabled.
 */
export function initConsentLinks(): void {
  const consent = document.querySelector<HTMLInputElement>('#consent');
  const controls = [
    ...document.querySelectorAll<HTMLElement>('[data-consent-control]'),
  ];
  if (!consent || controls.length === 0) return;

  const update = () => {
    for (const control of controls) {
      const current = control.firstElementChild;
      if (!current || (current.tagName === 'A') === consent.checked) continue;
      const next = document.createElement(consent.checked ? 'a' : 'button');
      next.className = current.className;
      next.append(...current.childNodes);
      if (next instanceof HTMLAnchorElement) {
        next.href = control.dataset.href ?? '';
        next.target = '_blank';
        next.rel = 'sponsored noopener';
        next.dataset.consentLink = '';
      } else {
        next.type = 'button';
        next.disabled = true;
        next.setAttribute('aria-disabled', 'true');
        next.setAttribute('aria-describedby', 'consent-hint');
      }
      current.replaceWith(next);
    }
  };
  consent.addEventListener('change', update);
  update();
}
