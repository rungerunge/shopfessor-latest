import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getJobStatus } from "app/services/queue.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return json({ error: "Job ID is required" }, { status: 400 });
  }

  try {
    const jobStatus = await getJobStatus(jobId);
    return json(jobStatus);
  } catch (error) {
    console.error("Error getting job status:", error);
    return json({ error: "Failed to get job status" }, { status: 500 });
  }
}
