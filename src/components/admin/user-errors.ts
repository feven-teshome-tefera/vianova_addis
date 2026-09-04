/**
 * Keep implementation details out of the interface while retaining them in the
 * browser console for support and development.
 */
export async function logAdminResponseFailure(response: Response, operation: string) {
  let details: unknown = null;

  try {
    const contentType = response.headers.get("content-type") ?? "";
    details = contentType.includes("application/json")
      ? await response.clone().json()
      : await response.clone().text();
  } catch {
    details = "The response body could not be read.";
  }

  console.error(`[Admin] ${operation} failed`, {
    status: response.status,
    statusText: response.statusText,
    details,
  });
}

/** Returns API copy that has already been made safe for the interface. */
export async function adminResponseMessage(
  response: Response,
  operation: string,
  fallback: string,
) {
  let details: unknown = null;
  try {
    const contentType = response.headers.get("content-type") ?? "";
    details = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    details = null;
  }

  console.error(`[Admin] ${operation} failed`, {
    status: response.status,
    statusText: response.statusText,
    details,
  });

  if (
    details &&
    typeof details === "object" &&
    "error" in details &&
    typeof details.error === "string"
  ) return details.error;

  return fallback;
}

export function publishingIssue(platform: string, technicalMessage?: string | null) {
  if (!technicalMessage) return "—";

  const message = technicalMessage.toLowerCase();

  if (/(token|unauthori[sz]ed|forbidden|credential|permission|oauth|access denied)/.test(message)) {
    return `${platform} needs to be reconnected. Check it under Integrations, then try again.`;
  }

  if (/(rate.?limit|too many requests|flood|429)/.test(message)) {
    return `${platform} is temporarily limiting posts. Wait a few minutes, then try again.`;
  }

  if (/(channel|chat).*(not found|invalid|missing)|bot.*admin/.test(message)) {
    return `The ${platform} destination could not be reached. Check the channel and administrator access under Integrations.`;
  }

  if (/(image|photo|video|media|file|format|size|dimension)/.test(message)) {
    return `${platform} could not use this product's media. Check the image or video and try again.`;
  }

  if (/(timeout|timed out|network|fetch|connection|unavailable|econn)/.test(message)) {
    return `${platform} did not respond. Check your connection and try again.`;
  }

  return `This product could not be published to ${platform}. Check the integration and try again.`;
}
