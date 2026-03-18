const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiClient(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

