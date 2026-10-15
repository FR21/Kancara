const REQUEST_TIMEOUT_MS = 20000;
const RATE_LIMIT_WAIT_MS = 1100;

export type ProfileDetails = {
  name: string;
  username: string;
  nationality: string;
  /** In international form, or empty. */
  phone: string;
  /** YYYY-MM-DD. */
  birthDate: string;
  gender: string;
};

/** Thrown when a profile request fails. `status` tells a taken username (409) from other failures. */
export class ProfileError extends Error {
  constructor(readonly status: number) {
    super(`Profile request failed with ${status}`);
  }
}

async function send(path: string, init: RequestInit, retried = false): Promise<Response> {
  const response = await fetch(path, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(path, init, true);
  }
  if (!response.ok) throw new ProfileError(response.status);
  return response;
}

export async function saveProfileDetails(details: ProfileDetails): Promise<void> {
  await send("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
}

/** Uploads a profile photo and returns the address it is now served from. */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const body = new FormData();
  body.set("photo", file);
  const response = await send("/api/profile/photo", { method: "POST", body });
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null || !("photo" in result) || typeof result.photo !== "string") {
    throw new ProfileError(response.status);
  }
  return result.photo;
}

export async function saveVisitedCountries(codes: string[]): Promise<void> {
  await send("/api/travel/visited", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
  });
}
