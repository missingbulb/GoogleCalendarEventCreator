// seatgeek.com event pages: https://seatgeek.com/<event-slug>/
//
// SeatGeek bakes all event data into the page's Next.js #__NEXT_DATA__ JSON blob.
//
// Category / listing pages (e.g. /concert-tickets) carry a popularEvents.events
// array in pageProps — each entry is a fully-described event with title, a
// floating local datetime, a full venue record (name + street address + city +
// state + zip + IANA timezone), and a UTC end time.
//
// Where each field comes from:
//   title       event.title
//   start       event.datetime_local (already a floating local ISO datetime)
//   end         event.enddatetime_utc converted to floating local time using
//               the UTC offset implied by (datetime_local – datetime_utc)
//   location    venue.name, venue.address, venue.city, venue.state, venue.postal_code
//   ctz         venue.timezone (IANA timezone name, e.g. "America/New_York")
//   description event.description (empty for most events)
//
(() => {
  const { normalizeDateValue, jsonScript } = GCal;

  // Convert a UTC datetime string (no "Z") to a floating local time using the
  // UTC offset implied by the event's own datetime_local / datetime_utc pair.
  // Treats both as wall-clock UTC to extract the offset, then shifts endUtc by it.
  function localEnd(dtLocal, dtUtc, endUtc) {
    const pad = (n) => String(n).padStart(2, "0");
    const localMs = new Date(dtLocal + "Z").getTime();
    const utcMs = new Date(dtUtc + "Z").getTime();
    if (isNaN(localMs) || isNaN(utcMs)) return "";
    const offsetMs = localMs - utcMs;
    const endMs = new Date(endUtc + "Z").getTime();
    if (isNaN(endMs)) return "";
    const d = new Date(endMs + offsetMs);
    return (
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`
    );
  }

  GCal.sources.push({
    name: "seatgeek",
    matches: (host) => /(^|\.)seatgeek\.com$/.test(host),
    extract() {
      const data = jsonScript("#__NEXT_DATA__");
      const pageProps = data && data.props && data.props.pageProps;
      if (!pageProps) return {};

      const raw = pageProps.popularEvents && pageProps.popularEvents.events;
      if (!Array.isArray(raw) || !raw.length) return {};

      const events = raw
        .map((evt) => {
          const venue = evt.venue || {};
          const loc = [venue.name, venue.address, venue.city, venue.state, venue.postal_code]
            .filter(Boolean)
            .join(", ");
          return {
            title: evt.title || "",
            start: normalizeDateValue(evt.datetime_local || ""),
            end: evt.enddatetime_utc
              ? localEnd(evt.datetime_local, evt.datetime_utc, evt.enddatetime_utc)
              : "",
            location: loc,
            ctz: venue.timezone || "",
            description: evt.description || "",
          };
        })
        .filter((e) => e.title && e.start);

      return events.length ? { events } : {};
    },
  });
})();
