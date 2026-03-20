"use client";

import useSWR from "swr";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const fetcher = (url) => fetch(url).then(r=>r.json());

export function useJobs() {
  const { data, error, isLoading } = useSWR(`${API}/jobs/match`, fetcher);
  return { jobs: data || [], error, isLoading };
}
