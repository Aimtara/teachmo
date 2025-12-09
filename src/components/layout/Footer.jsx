import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white text-gray-500 text-sm px-4 py-3">
      <div className="flex items-center justify-between">
        <span>© {new Date().getFullYear()} Teachmo</span>
        <span>Building together for families, teachers, and admins</span>
      </div>
    </footer>
  );
}
