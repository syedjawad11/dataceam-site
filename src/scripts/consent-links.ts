/**
 * Keeps the referral links on /experts/ switched off until the visitor ticks
 * the consent box. Nothing is stored or sent: the box is only read here.
 * Without JavaScript the links simply work, with the disclosure beside them.
 */
export function initConsentLinks(): void {
  const consent = document.querySelector<HTMLInputElement>('#consent');
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>('[data-consent-link]'),
  ];
  if (!consent || links.length === 0) return;

  for (const link of links) {
    link.dataset.href = link.getAttribute('href') ?? '';
  }

  const update = () => {
    for (const link of links) {
      if (consent.checked) {
        link.setAttribute('href', link.dataset.href ?? '');
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
      }
    }
  };

  consent.addEventListener('change', update);
  update();
}
