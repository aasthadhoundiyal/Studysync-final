import React from 'react';
import TopBar from './TopBar';

/**
 * Navbar component for backward compatibility.
 * Re-exports the unified TopBar layout component.
 */
export function Navbar(props) {
  return <TopBar {...props} />;
}

export default Navbar;
