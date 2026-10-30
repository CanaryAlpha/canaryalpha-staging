/*
 * Custom report pipeline stages (Enterprise dashboard), in order. Rename or
 * reorder them here; the progress bar, stage tracker and history follow.
 * key: what the report pipeline sends; label: what the page shows. The last
 * stage is the finished state: reaching it means the report is delivered.
 */
window.CA_REPORT_STAGES = [
  { key: "received", label: "Order received" },
  { key: "collection", label: "Data collection" },
  { key: "forensics", label: "On-chain forensics" },
  { key: "scoring", label: "Scoring (80-point framework)" },
  { key: "writing", label: "Report writing" },
  { key: "review", label: "Quality review" },
  { key: "delivered", label: "Delivered" }
];
