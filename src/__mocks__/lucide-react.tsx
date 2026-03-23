import { forwardRef, type SVGProps } from 'react';

const MockIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} {...props} />
));

MockIcon.displayName = 'MockIcon';

export const Bell = MockIcon;
export const BookOpen = MockIcon;
export const ChevronDown = MockIcon;
export const MessageCircle = MockIcon;
export const X = MockIcon;

export default MockIcon;
