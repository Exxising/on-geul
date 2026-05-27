import React from 'react';
import { NavLink, Link } from 'react-router-dom';

const TopAppBar = () => {
  return (
    <header className="bg-surface border-b border-outline-variant fixed top-0 left-0 w-full z-50">
      <div className="max-w-[860px] mx-auto px-6 h-16 flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-headline-md text-headline-md font-extrabold text-on-surface hover:opacity-80 transition-opacity">
            온글
          </Link>
          <span className="hidden md:inline font-caption text-caption text-secondary ml-2">
            목소리를 정제된 글로, 온글
          </span>
        </div>
        <nav className="hidden md:flex gap-6 items-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `font-body-md text-body-md py-4 hover:text-primary transition-colors duration-150 ${
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-secondary'
              }`
            }
          >
            Upload
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `font-body-md text-body-md py-4 hover:text-primary transition-colors duration-150 ${
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-secondary'
              }`
            }
          >
            History
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `font-body-md text-body-md py-4 hover:text-primary transition-colors duration-150 ${
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-secondary'
              }`
            }
          >
            Calendar
          </NavLink>
        </nav>
        <button onClick={() => {
          const SLACK_CLIENT = import.meta.env.VITE_SLACK_CLIENT_ID;
          const REDIRECT = import.meta.env.VITE_SLACK_REDIRECT_URI;
          if (!SLACK_CLIENT || !REDIRECT) {
            window.location.href = '/';
            return;
          }
          const scopes = encodeURIComponent('identity.basic,identity.email,users:read');
          const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT}&scope=${scopes}&redirect_uri=${encodeURIComponent(REDIRECT)}`;
          window.location.href = url;
        }} className="font-label-md text-label-md text-primary px-4 py-2 border border-outline-variant rounded hover:bg-surface-container-low transition-colors duration-150">
          Sign In
        </button>
      </div>
    </header>
  );
};

export default TopAppBar;
