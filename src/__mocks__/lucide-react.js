import React from 'react';

const MockIcon = React.forwardRef((props, ref) => <svg ref={ref} {...props} />);

export const Bell = MockIcon;
export const BookOpen = MockIcon;
export const ChevronDown = MockIcon;
export const MessageCircle = MockIcon;
export const X = MockIcon;

export default MockIcon;
