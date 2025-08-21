import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link 
        to={createPageUrl("Dashboard")} 
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="sr-only">Dashboard</span>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.href && index < items.length - 1 ? (
            <Link 
              to={item.href} 
              className="hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "text-gray-900 font-medium" : ""}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function BreadcrumbItem({ children, href, isCurrentPage = false }) {
  if (href && !isCurrentPage) {
    return (
      <Link to={href} className="hover:text-gray-900 transition-colors">
        {children}
      </Link>
    );
  }
  
  return (
    <span className={isCurrentPage ? "text-gray-900 font-medium" : ""}>
      {children}
    </span>
  );
}