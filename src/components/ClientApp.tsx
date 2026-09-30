"use client";

import dynamic from "next/dynamic";

/**
 * Everything lives in the browser (calendar links, settings, the last copy of each
 * calendar), so the app renders only on the client. The server sends a skeleton.
 */
const App = dynamic(() => import("./App").then((m) => m.App), { ssr: false, loading: () => <Skeleton /> });

export function ClientApp() {
  return <App />;
}

function Skeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-3" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-40 w-full mt-6" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-full" />
    </div>
  );
}
