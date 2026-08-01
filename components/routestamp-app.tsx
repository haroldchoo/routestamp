"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityIcon } from "@/components/activity-icon";
import { PassportLogo } from "@/components/passport-logo";
import { WorldMap } from "@/components/world-map";
import { buildDashboardSummary, buildRouteStampEntries, filterAndSortRouteStampEntries, formatDate, formatDistance, formatDuration, sportLabel } from "@/lib/domain";
import { usRegions } from "@/lib/regions";
import type { RouteStampSort } from "@/lib/domain";
import { createDemoState } from "@/lib/demo";
import type { ActivityPage, ActivitySummary, AppState, Country, RegionEntry, RouteStampEntry, PrivacySettings, SyncJob } from "@/lib/types";

type RouteName = "dashboard" | "routestamp" | "regions" | "map" | "country" | "activities" | "settings" | "settings/privacy";

const routes = new Set<RouteName>(["dashboard", "routestamp", "regions", "map", "country", "activities", "settings", "settings/privacy"]);

export function RouteStampApp() {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [route, setRoute] = useState<RouteName>("dashboard");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    setState((await response.json()) as AppState);
  }, []);

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3600);
  };

  useEffect(() => {
    const readRoute = () => {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith("country/")) {
        setCountryCode(hash.slice("country/".length).toUpperCase());
        setRoute("country");
        return;
      }
      setCountryCode(null);
      const candidate = hash as RouteName;
      setRoute(routes.has(candidate) ? candidate : "dashboard");
    };
    readRoute();
    window.addEventListener("hashchange", readRoute);
    const loadTimer = window.setTimeout(() => void loadState(), 0);
    const theme = window.localStorage.getItem("routestamp-theme");
    document.documentElement.classList.toggle("dark", theme === "dark");
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    let toastTimer: number | null = null;
    if (oauthError) {
      toastTimer = window.setTimeout(() => toast(oauthError), 0);
      params.delete("oauth_error");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }
    return () => {
      window.clearTimeout(loadTimer);
      if (toastTimer) window.clearTimeout(toastTimer);
      window.removeEventListener("hashchange", readRoute);
    };
  }, [loadState]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    window.localStorage.setItem("routestamp-theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  };

  useEffect(() => {
    if (!state.authenticated || !["pending", "running", "rate_limited"].includes(state.syncJob.status) || state.syncJob.id === "none") return;
    const delay = state.syncJob.status === "rate_limited" && state.syncJob.retryAfterSeconds
      ? Math.min(Math.max(state.syncJob.retryAfterSeconds, 5), 60) * 1000
      : 5000;
    const syncTimer = window.setTimeout(async () => {
      const response = await fetch(`/api/sync/${state.syncJob.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const job = (await response.json()) as SyncJob;
      setState((current) => ({ ...current, syncJob: job }));
      if (job.status === "completed") {
        await loadState();
        toast("Strava synchronization completed.");
      }
      if (job.status === "failed") toast(job.error ?? "Synchronization failed.");
    }, delay);
    return () => window.clearTimeout(syncTimer);
  }, [loadState, state.authenticated, state.syncJob]);

  const sync = async () => {
    if (!state.authenticated || !state.providerConnected) {
      window.location.assign("/api/auth/strava");
      return;
    }
    setBusy(true);
    try {
      const start = await fetch("/api/sync/start", { method: "POST" });
      if (!start.ok) throw new Error(await responseMessage(start));
      const job = (await start.json()) as SyncJob;
      setState((current) => ({ ...current, syncJob: job }));
      toast(job.status === "completed" ? "Strava synchronization completed." : "Sync advanced. Continue if more activities remain.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Synchronization failed.");
    } finally {
      setBusy(false);
    }
  };

  const joinWithInvite = () => {
    const inviteCode = window.prompt("Paste your RouteStamp invite code");
    if (!inviteCode?.trim()) return;
    window.location.assign(`/api/auth/strava?invite=${encodeURIComponent(inviteCode.trim())}`);
  };

  const updatePrivacy = async (next: PrivacySettings) => {
    if (!state.authenticated) return;
    setState((current) => ({ ...current, privacySettings: next }));
    const response = await fetch("/api/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      await loadState();
      toast(await responseMessage(response));
      return;
    }
    toast("Privacy settings saved.");
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Strava? Imported activity summaries will remain available.")) return;
    setBusy(true);
    const response = await fetch("/api/disconnect", { method: "POST" });
    await loadState();
    setBusy(false);
    toast(response.ok ? "Strava disconnected." : await responseMessage(response));
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete the private beta account and all imported activity summaries?")) return;
    setBusy(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      toast(await responseMessage(response));
      return;
    }
    setState(createDemoState());
    window.location.hash = "dashboard";
    toast("Account data deleted.");
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#dashboard" aria-label="RouteStamp dashboard">
            <PassportLogo />
            <span><strong>RouteStamp</strong><small>A passport of your Strava activities</small></span>
          </a>
          <Nav className="desktop-nav" route={route} />
          <div className="topbar-actions">
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle color theme">◐</button>
            <a className="user-menu" href="#settings" aria-label={`${state.user.displayName} settings`}>
              <UserAvatar displayName={state.user.displayName} avatarUrl={state.user.avatarUrl} />
              <span className="user-menu-copy">
                <strong>{state.user.displayName}</strong>
                <small>{state.providerConnected ? "Strava connected" : state.mode === "demo" ? "Demo Mode" : "Strava disconnected"}</small>
              </span>
            </a>
          </div>
        </header>

        <main id="main" className="main" tabIndex={-1}>
          {route === "dashboard" && <Dashboard state={state} busy={busy} onSync={sync} onJoinWithInvite={joinWithInvite} />}
          {route === "routestamp" && <RouteStamp state={state} />}
          {route === "regions" && <Regions state={state} />}
          {route === "map" && <MapView state={state} />}
          {route === "country" && <CountryDetail state={state} countryCode={countryCode} />}
          {route === "activities" && <Activities state={state} />}
          {route === "settings/privacy" && <Privacy state={state} onChange={updatePrivacy} />}
          {route === "settings" && (
            <Settings
              state={state}
              busy={busy}
              onSync={sync}
              onDisconnect={disconnect}
              onDelete={deleteAccount}
            />
          )}
        </main>

        <nav className="bottom-nav" aria-label="Primary mobile">
          <a href="#dashboard" aria-current={route === "dashboard" ? "page" : undefined}>Home</a>
          <a href="#routestamp" aria-current={route === "routestamp" ? "page" : undefined}>RouteStamp</a>
          <a href="#regions" aria-current={route === "regions" ? "page" : undefined}>Regions</a>
          <a href="#map" aria-current={route === "map" ? "page" : undefined}>Map</a>
          <a href="#activities" aria-current={route === "activities" ? "page" : undefined}>Log</a>
          <a href="#settings" aria-current={route === "settings" || route === "settings/privacy" ? "page" : undefined}>Settings</a>
        </nav>
      </div>
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {notice && <div className="toast">{notice}</div>}
      </div>
    </>
  );
}

function UserAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!avatarUrl || imageFailed) {
    return <span className="avatar" aria-hidden="true">{initials(displayName)}</span>;
  }

  return (
    // Strava supplies this URL as part of the authenticated athlete profile.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="avatar avatar-image" src={avatarUrl} alt="" onError={() => setImageFailed(true)} />
  );
}

function Dashboard({ state, busy, onSync, onJoinWithInvite }: { state: AppState; busy: boolean; onSync: () => void; onJoinWithInvite: () => void }) {
  const summary = buildDashboardSummary(state);
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">{state.mode === "live" ? "Private Beta" : "Demo Mode"}</span>
          <h1>This shows where sport has taken you.</h1>
          <p>A private-by-default RouteStamp for runs, rides, swims, hikes, and race weekends.</p>
          <div className="action-row">
            {state.authenticated ? (
              <button className="button primary" type="button" disabled={busy || !state.providerConnected} onClick={onSync}>
                {busy ? "Syncing..." : activeSyncLabel(state.syncJob)}
              </button>
            ) : (
              <>
                <a className="button primary" href="/api/auth/strava">Sign In with Strava</a>
                <button className="button secondary" type="button" onClick={onJoinWithInvite}>Join with Invite</button>
              </>
            )}
            <a className="button secondary" href="#settings/privacy">Privacy Settings</a>
          </div>
          <SyncProgress job={state.syncJob} />
        </div>
        <div className="route-stamp-preview" aria-label="Passport snapshot of your current RouteStamp country stamps">
          <div>
            <strong>Passport</strong>
          </div>
          <div className="preview-stamps">
            {summary.recentCountries.length ? summary.recentCountries.slice(0, 4).map((entry) => (
              <div className="preview-stamp" key={entry.country.code}>
                <span className="preview-stamp-flag" aria-hidden="true">{entry.country.flag}</span>
                <small>{entry.country.name}</small>
              </div>
            )) : <span className="preview-empty">No stamps yet</span>}
          </div>
        </div>
      </section>
      <section className="metric-grid" aria-label="RouteStamp summary">
        <Metric label="Countries" value={summary.countriesVisited} detail="Unlocked destinations" />
        <Metric label="Continents" value={summary.continentsVisited} detail="Across your activities" />
        <Metric label="Activities" value={summary.activityCount} detail={`${summary.unresolvedActivityCount} awaiting a country`} />
        <Metric label="Distance" value={formatDistance(summary.totalDistanceMeters)} detail="Total distance" />
      </section>
      <section className="two-column">
        <div>
          <SectionHeading title="Recent unlocks" href="#routestamp" label="View RouteStamp" />
          <div className="country-list">{summary.recentCountries.map((entry) => <CountryRow key={entry.country.code} entry={entry} />)}</div>
        </div>
        <div>
          <SectionHeading title="Recent activities" href="#activities" label="View all" />
          <div className="activity-list">{state.recentActivities.map((activity) => <ActivityRow key={activity.id} activity={activity} countries={state.countries} />)}</div>
        </div>
      </section>
    </>
  );
}

function RouteStamp({ state }: { state: AppState }) {
  const entries = buildRouteStampEntries(state);
  const [scope, setScope] = useState<"unlocked" | "all">("unlocked");
  const [sportFilter, setSportFilter] = useState("all");
  const [sortBy, setSortBy] = useState<RouteStampSort>("latest");
  const sportTypes = [...new Set(entries.flatMap((entry) => entry.sportTypes))].sort((a, b) => sportLabel(a).localeCompare(sportLabel(b)));
  const visibleEntries = filterAndSortRouteStampEntries(entries, sportFilter, sortBy);
  const unlocked = new Set(entries.map((entry) => entry.country.code));
  const locked = scope === "all" && sportFilter === "all"
    ? state.countries.filter((country) => !unlocked.has(country.code)).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const hasResults = visibleEntries.length > 0 || locked.length > 0;
  return (
    <>
      <PageTitle title="RouteStamp" copy="Collected country stamps from your endurance activity history." />
      <ShareRouteStampButton />
      <div className="toolbar" role="toolbar" aria-label="RouteStamp filters">
        <select className="chip" aria-label="Country status" value={scope} onChange={(event) => setScope(event.target.value as "unlocked" | "all")}>
          <option value="unlocked">Unlocked</option>
          <option value="all">All countries</option>
        </select>
        <select className="chip" aria-label="Sport type" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
          <option value="all">All sports</option>
          {sportTypes.map((sport) => <option value={sport} key={sport}>{sportLabel(sport)}</option>)}
        </select>
        <select className="chip" aria-label="RouteStamp order" value={sortBy} onChange={(event) => setSortBy(event.target.value as RouteStampSort)}>
          <option value="latest">Latest visit</option>
          <option value="earliest">Earliest visit</option>
          <option value="country">Country A-Z</option>
          <option value="activities">Most activities</option>
        </select>
      </div>
      {hasResults ? (
        <section className="stamp-grid" aria-label={scope === "unlocked" ? "Unlocked RouteStamp stamps" : "All RouteStamp countries"}>
          {visibleEntries.map((entry) => <StampCard key={entry.country.code} entry={entry} />)}
          {locked.map((country) => <LockedStampCard key={country.code} country={country} />)}
        </section>
      ) : (
        <section className="empty-state route-stamp-empty"><h2>No matching stamps</h2><p>Choose another sport to see countries from those activities.</p></section>
      )}
    </>
  );
}

function Regions({ state }: { state: AppState }) {
  if (!state.authenticated) {
    return <><PageTitle title="Regions" copy="Your state coverage is private to your signed-in RouteStamp account." /><section className="empty-state"><h2>Sign in to view regions</h2><p>Connect Strava to see the states your activities have unlocked.</p><a className="button primary" href="/api/auth/strava">Sign In with Strava</a></section></>;
  }
  const visited = new Map(state.regionEntries.map((entry) => [entry.region.code, entry]));
  return (
    <>
      <PageTitle title="Regions" copy="Track the US states and district your Strava activities have taken you through." />
      <section className="metric-grid" aria-label="US regions summary">
        <Metric label="States visited" value={state.regionEntries.length} detail={`of ${usRegions.length} supported regions`} />
        <Metric label="States remaining" value={usRegions.length - state.regionEntries.length} detail="Not unlocked yet" />
        <Metric label="Region activities" value={state.regionEntries.reduce((total, entry) => total + entry.activityCount, 0)} detail="Resolved to a state or district" />
        <Metric label="Coverage" value={`${Math.round((state.regionEntries.length / usRegions.length) * 100)}%`} detail="US state coverage" />
      </section>
      <section className="region-grid" aria-label="US states and district">
        {usRegions.map((region) => <RegionCard key={region.code} entry={visited.get(region.code)} regionName={region.name} shortCode={region.shortCode} />)}
      </section>
    </>
  );
}

function ShareRouteStampButton() {
  const [notice, setNotice] = useState<string | null>(null);

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "routestamp";
    try {
      if (navigator.share) {
        await navigator.share({ title: "My RouteStamp", text: "My RouteStamp passport", url: url.toString() });
        setNotice("RouteStamp link ready to share.");
      } else {
        await navigator.clipboard.writeText(url.toString());
        setNotice("RouteStamp link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Unable to share the RouteStamp link.");
    }
  };

  return (
    <div className="share-row">
      <button className="button secondary" type="button" onClick={() => void share()}>Share RouteStamp</button>
      {notice && <small className="helper" role="status">{notice}</small>}
    </div>
  );
}

function MapView({ state }: { state: AppState }) {
  const entries = buildRouteStampEntries(state);
  return (
    <>
      <PageTitle title="Map" copy="A generalized country map for exploration. Exact activity coordinates are not retained." />
      <section className="map-layout">
        <WorldMap entries={entries} onCountrySelect={(code) => { window.location.hash = `country/${code}`; }} />
        <div className="map-panel"><h2>Visited countries</h2><p>Country summaries are derived server-side and contain no activity coordinates.</p><div className="country-list compact">{entries.map((entry) => <CountryRow key={entry.country.code} entry={entry} />)}</div></div>
      </section>
    </>
  );
}

function CountryDetail({ state, countryCode }: { state: AppState; countryCode: string | null }) {
  const country = state.countries.find((item) => item.code === countryCode);
  const countryEntry = buildRouteStampEntries(state).find((entry) => entry.country.code === countryCode);
  if (!country) {
    return <><PageTitle title="Country not found" copy="That country is not available in this passport." /><a className="text-link" href="#map">← Back to Map</a></>;
  }

  if (country.code !== "US") {
    return (
      <>
        <a className="text-link" href="#map">← Back to Map</a>
        <PageTitle title={`${country.flag} ${country.name}`} copy="Country-level RouteStamp details are available here. Region tracking is currently available for the United States." />
        {countryEntry ? <section className="metric-grid" aria-label={`${country.name} summary`}>
          <Metric label="Activities" value={countryEntry.activityCount} detail="Activities in this country" />
          <Metric label="Distance" value={formatDistance(countryEntry.totalDistanceMeters)} detail="Total distance" />
          <Metric label="Last visit" value={formatDate(countryEntry.lastVisitedAt)} detail="Most recent activity" />
          <Metric label="Sports" value={countryEntry.sportTypes.length} detail="Sport types" />
        </section> : <section className="empty-state"><h2>No country stamp yet</h2><p>This country has not been unlocked by an imported activity.</p></section>}
      </>
    );
  }

  const visited = new Map(state.regionEntries.map((entry) => [entry.region.code, entry]));
  return (
    <>
      <a className="text-link" href="#map">← Back to Map</a>
      <PageTitle title="🇺🇸 United States" copy="State-level activity coverage from your US RouteStamp visits." />
      <section className="metric-grid" aria-label="United States summary">
        <Metric label="States visited" value={state.regionEntries.length} detail={`of ${usRegions.length} supported regions`} />
        <Metric label="Activities" value={countryEntry?.activityCount ?? 0} detail="Activities in the United States" />
        <Metric label="Distance" value={formatDistance(countryEntry?.totalDistanceMeters ?? 0)} detail="Total distance" />
        <Metric label="Last visit" value={countryEntry ? formatDate(countryEntry.lastVisitedAt) : "—"} detail="Most recent US activity" />
      </section>
      <section className="region-grid" aria-label="United States states and district">
        {usRegions.map((region) => <RegionCard key={region.code} entry={visited.get(region.code)} regionName={region.name} shortCode={region.shortCode} />)}
      </section>
    </>
  );
}

function Activities({ state }: { state: AppState }) {
  const [rows, setRows] = useState<ActivitySummary[]>(() => state.authenticated ? state.recentActivities : state.activities ?? state.recentActivities);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const countries = new Map(state.countries.map((country) => [country.code, country]));
  const loadPage = useCallback(async (cursor: string | null = null) => {
    if (!state.authenticated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/activities?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response));
      const page = (await response.json()) as ActivityPage;
      setRows((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [state.authenticated]);

  useEffect(() => {
    if (!state.authenticated) return;
    const timer = window.setTimeout(() => void loadPage(null), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage, state.authenticated, state.syncJob.completedAt]);

  return (
    <>
      <PageTitle title="Activities" copy="Private summaries used to build your RouteStamp." />
      <section className="table-wrap" aria-label="Activity summaries">
        <table><thead><tr><th>Activity</th><th>Country</th><th>Sport</th><th>Date</th><th>Distance</th><th>Time</th></tr></thead>
          <tbody>{rows.map((activity) => {
            const country = activity.countryCode ? countries.get(activity.countryCode) : null;
            return <tr key={activity.id}><td>{activity.name}</td><td>{country ? `${country.flag} ${country.name}` : <span className="unresolved">Unresolved</span>}</td><td><span className="sport-label"><ActivityIcon sportType={activity.sportType} size={18} />{sportLabel(activity.sportType)}</span></td><td>{formatDate(activity.startTime)}</td><td>{formatDistance(activity.distanceMeters)}</td><td>{formatDuration(activity.movingTimeSeconds)}</td></tr>;
          })}</tbody>
        </table>
        {state.authenticated && nextCursor && <button className="button secondary" type="button" disabled={loading} onClick={() => void loadPage(nextCursor)}>{loading ? "Loading..." : "Load More"}</button>}
      </section>
    </>
  );
}

function Privacy({ state, onChange }: { state: AppState; onChange: (settings: PrivacySettings) => void }) {
  const settings = state.privacySettings;
  const changeVisibility = (key: keyof PrivacySettings["visibility"], value: boolean) => {
    onChange({ ...settings, visibility: { ...settings.visibility, [key]: value }, updatedAt: new Date().toISOString() });
  };
  return (
    <>
      <PageTitle title="Privacy Settings" copy="Choose which profile and RouteStamp details are included when you share this page." />
      <section className="settings-grid">
        <div className="settings-panel"><h2>Shared RouteStamp fields</h2>{Object.entries(settings.visibility).map(([key, value]) => <Toggle key={key} label={privacyLabel(key)} checked={value} disabled={!state.authenticated} onChange={(checked) => changeVisibility(key as keyof PrivacySettings["visibility"], checked)} />)}</div>
      </section>
    </>
  );
}

function Settings({ state, busy, onSync, onDisconnect, onDelete }: { state: AppState; busy: boolean; onSync: () => void; onDisconnect: () => void; onDelete: () => void }) {
  return (
    <>
      <PageTitle title="Settings" copy="Manage the private connection, export, disconnect, and account deletion controls." />
      <section className="settings-grid">
        <div className="settings-panel"><h2>Connected app</h2><p>{state.providerConnected ? "Strava connection is active." : state.authenticated ? "Reconnect Strava without an invite code." : "Connect Strava to import your activities."}</p>{state.authenticated ? <button className="button primary" type="button" onClick={onSync} disabled={busy}>{state.providerConnected ? "Manual Sync" : "Reconnect Strava"}</button> : <a className="button primary" href="/api/auth/strava">Sign In with Strava</a>}<SyncProgress job={state.syncJob} /></div>
        <FriendInvitePanel authenticated={state.authenticated} />
        <div className="settings-panel"><h2>Privacy Settings</h2><p>Choose which profile and RouteStamp details are included when you share your page.</p><a className="button secondary" href="#settings/privacy">Open Privacy Settings</a></div>
        <div className="settings-panel"><h2>Export</h2><p>Download profile, RouteStamp, summaries, privacy settings, and safe connection metadata.</p><a className="button secondary" href={state.authenticated ? "/api/export" : undefined} aria-disabled={!state.authenticated}>Export Data</a></div>
        <div className="settings-panel danger"><h2>Disconnect Strava</h2><p>Revoke provider access while retaining imported summaries.</p><button className="button destructive" type="button" disabled={!state.providerConnected || busy} onClick={onDisconnect}>Disconnect</button></div>
        <div className="settings-panel danger"><h2>Delete account</h2><p>Revoke access and permanently delete all private-beta records.</p><button className="button destructive" type="button" disabled={!state.authenticated || busy} onClick={onDelete}>Delete Account</button></div>
      </section>
    </>
  );
}

function FriendInvitePanel({ authenticated }: { authenticated: boolean }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const createFriendInvite = async () => {
    setCreating(true);
    setInviteNotice(null);
    try {
      const response = await fetch("/api/invites", { method: "POST" });
      const body = await response.json() as { inviteUrl?: string; error?: string };
      if (!response.ok || !body.inviteUrl) throw new Error(body.error ?? `Request failed (${response.status})`);
      setInviteUrl(body.inviteUrl);
      try {
        await navigator.clipboard.writeText(body.inviteUrl);
        setInviteNotice("Invite link created and copied.");
      } catch {
        setInviteNotice("Invite link created. Copy it below.");
      }
    } catch (error) {
      setInviteNotice(error instanceof Error ? error.message : "Unable to create invite.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="settings-panel">
      <h2>Invite a friend</h2>
      <p>Create a one-time invite link. It expires after 30 days.</p>
      <button className="button secondary" type="button" disabled={!authenticated || creating} onClick={() => void createFriendInvite()}>
        {creating ? "Creating..." : "Create & Copy Invite"}
      </button>
      {inviteUrl && <code className="invite-link">{inviteUrl}</code>}
      {inviteNotice && <small className="helper" role="status">{inviteNotice}</small>}
    </div>
  );
}

function Nav({ className, route }: { className: string; route: RouteName }) {
  return <nav className={className} aria-label="Primary"><NavLinks route={route} /></nav>;
}

function NavLinks({ route }: { route: RouteName }) {
  const items: Array<[RouteName, string]> = [["dashboard", "Dashboard"], ["routestamp", "RouteStamp"], ["regions", "Regions"], ["map", "Map"], ["activities", "Activities"], ["settings", "Settings"]];
  return <>{items.map(([key, label]) => <a key={key} href={`#${key}`} aria-current={route === key ? "page" : undefined}>{label}</a>)}</>;
}

function PageTitle({ title, copy }: { title: string; copy: string }) { return <section className="page-title"><span className="eyebrow">RouteStamp</span><h1>{title}</h1><p>{copy}</p></section>; }
function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function SectionHeading({ title, href, label }: { title: string; href: string; label: string }) { return <div className="section-heading"><h2>{title}</h2><a className="text-link" href={href}>{label}</a></div>; }
function CountryRow({ entry }: { entry: RouteStampEntry }) { return <article className="row-card"><span className="flag">{entry.country.flag}</span><div><strong>{entry.country.name}</strong><small>{entry.activityCount} activities · {formatDistance(entry.totalDistanceMeters)}</small></div><span>{formatDate(entry.lastVisitedAt)}</span></article>; }
function ActivityRow({ activity, countries }: { activity: ActivitySummary; countries: Country[] }) { const country = activity.countryCode ? countries.find((item) => item.code === activity.countryCode) : null; return <article className="row-card"><span className="sport"><ActivityIcon sportType={activity.sportType} /></span><div><strong>{activity.name}</strong><small>{country ? `${country.flag} ${country.name}` : "Country unresolved"} · {sportLabel(activity.sportType)}</small></div><span>{formatDistance(activity.distanceMeters)}</span></article>; }
function RegionCard({ entry, regionName, shortCode }: { entry: RegionEntry | undefined; regionName: string; shortCode: string }) { return <article className={`region-card${entry ? " visited" : ""}`}><div className="region-card-heading"><span className="region-code">{shortCode}</span><div><h2>{regionName}</h2><small>{entry ? `${entry.activityCount} activities · ${formatDistance(entry.totalDistanceMeters)}` : "Not visited yet"}</small></div></div>{entry && <p>Last visit {formatDate(entry.lastVisitedAt)}</p>}</article>; }
function StampCard({ entry }: { entry: RouteStampEntry }) { return <article className="stamp-card"><div className={`stamp ${entry.stamp.variant}`} aria-hidden="true"><span>{entry.country.flag}</span></div><h2>{entry.country.name}</h2><p>{entry.activityCount} activities · {formatDistance(entry.totalDistanceMeters)}</p><div className="badge-row">{entry.sportTypes.map((sport) => <span className="badge sport-label" key={sport}><ActivityIcon sportType={sport} size={14} />{sportLabel(sport)}</span>)}</div></article>; }
function LockedStampCard({ country }: { country: Country }) { return <article className="stamp-card locked"><div className="stamp locked-stamp" aria-hidden="true"><span>{country.flag}</span></div><h2>{country.name}</h2><p>No activities imported yet.</p></article>; }
function Toggle({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange?: (value: boolean) => void }) { return <label className="toggle"><span>{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} /></label>; }
function SyncProgress({ job }: { job: SyncJob }) { if (!["pending", "running", "rate_limited"].includes(job.status)) return null; return <div className="sync-progress"><progress max={Math.max(job.processed + 200, 200)} value={job.processed} /><small>{job.status === "pending" ? "Queued for server sync" : job.status === "rate_limited" ? `Paused for ${job.retryAfterSeconds ?? "a few"} seconds` : `${job.processed} activities processed`}</small></div>; }

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function privacyLabel(key: string) { return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()); }
function activeSyncLabel(job: SyncJob) { return ["pending", "running", "rate_limited"].includes(job.status) ? "Continue Sync" : "Manual Sync"; }
async function responseMessage(response: Response) { try { const body = await response.json() as { error?: string }; return body.error ?? `Request failed (${response.status})`; } catch { return `Request failed (${response.status})`; } }
