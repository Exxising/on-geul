import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNavBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 md:hidden px-4 bg-surface border-t border-outline-variant">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center active:scale-95 transition-transform duration-100 flex-1 h-full ${
            isActive ? 'text-primary font-bold' : 'text-secondary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined mb-1"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              upload_file
            </span>
            <span className="font-label-md text-[10px]">Upload</span>
          </>
        )}
      </NavLink>
      <NavLink
        to="/history"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center active:scale-95 transition-transform duration-100 flex-1 h-full ${
            isActive ? 'text-primary font-bold' : 'text-secondary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined mb-1"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              history
            </span>
            <span className="font-label-md text-[10px]">History</span>
          </>
        )}
      </NavLink>
      <NavLink
        to="/calendar"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center active:scale-95 transition-transform duration-100 flex-1 h-full ${
            isActive ? 'text-primary font-bold' : 'text-secondary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined mb-1"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              calendar_today
            </span>
            <span className="font-label-md text-[10px]">Calendar</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default BottomNavBar;
