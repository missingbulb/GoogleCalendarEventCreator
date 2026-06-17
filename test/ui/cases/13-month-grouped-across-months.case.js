// The headline of month grouping: an event with one show on several scattered
// days across two months. The three June dates (5, 14, 25) fold into ONE month
// card — icon JUN over the 5–25 range, a button per day — and the lone July date
// is its own plain single card. (Compare the old behavior: four separate single
// cards, one per date.)
module.exports = {
  description:
    "Month grouping across months: three scattered June dates become one JUN card (5/14/25), the July date a single card",
  data: {
    supported: true,
    events: [
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-05T19:00:00", end: null },
          { start: "2026-06-14T19:00:00", end: null },
          { start: "2026-06-25T19:00:00", end: null },
          { start: "2026-07-01T19:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
