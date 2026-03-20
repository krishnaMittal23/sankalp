import JobsClient from "./JobsClient";

// Prevent static prerendering — this page depends on client-side search params
export const dynamic = "force-dynamic";

export default function JobsPage() {
  return <JobsClient />;
}