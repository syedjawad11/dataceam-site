import { fileURLToPath } from 'node:url';

// Satteri (Astro's markdown processor) hast plugin: wraps tables of guide
// articles in a keyboard-focusable scroll region, so wide tables scroll inside
// the column (WCAG 2.1.1) and never widen the page. Other collections keep
// their markup.
export const tableScroll = {
  name: 'dataceam-table-scroll',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      const file = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '';
      if (!file.replaceAll('\\', '/').includes('/src/content/guides/')) return;
      ctx.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          tabIndex: 0,
          role: 'region',
          ariaLabel: 'Scrollable table',
        },
        children: [],
      });
    },
  },
};
