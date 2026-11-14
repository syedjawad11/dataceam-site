/** Area filter buttons for the "All open roles" list on /experts/. */
export function initRoleFilters(): void {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-filter]'),
  ];
  const items = [
    ...document.querySelectorAll<HTMLLIElement>('#all-roles > li'),
  ];
  const status = document.querySelector<HTMLElement>('#filter-status');
  if (buttons.length === 0 || items.length === 0) return;

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter ?? 'all';
      let shown = 0;
      for (const item of items) {
        const visible = filter === 'all' || item.dataset.domain === filter;
        item.hidden = !visible;
        if (visible) shown += 1;
      }
      for (const other of buttons) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      if (status) {
        const label = button.firstChild?.textContent?.trim() ?? 'All';
        status.textContent = `Showing ${shown} roles: ${label}.`;
      }
    });
  }
}
